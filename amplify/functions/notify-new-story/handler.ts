/**
 * notify-new-story Lambda
 *
 * Triggered by SQS (runts-notify-new-story-queue).
 * Each message body contains: { storyId, authorId, title, isErotic }
 * queued by the runts-notify-story-stream Lambda when a story's
 * `live` field flips from 'false' to 'true'.
 *
 *   1. Skip erotic stories
 *   2. AUTHOR phase: find all users following the story's author (skipping those who switched this author off),
 *      find their push tokens from the UserDevice table, send via the Expo Push API
 *   3. GENRE phase: for each (non-erotic) tag on the story, page through the people following that tag with
 *      notifications on (UserFollowedTag byTagId). Skip anyone the author push already reached, and cap each
 *      device at one genre push a day with a conditional write on UserDevice.lastGenrePushAt.
 *
 * Both phases walk pages (never a scan, flat memory) and hand the rest to a continuation message when the run
 * time is nearly up, so any number of followers is covered.
 */

import { SQSHandler } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const REGION      = 'us-east-2';
const PROD_API_ID = 'nzvkuznrzjfc5kud3vfik5j7ey';

const dynamo = new DynamoDBClient({ region: REGION });
const sqs    = new SQSClient({ region: REGION });

// Stop starting new follower pages when less than this much run time is left, and hand the rest
// to a continuation message instead, so a big follower list is never cut off mid-way by a timeout.
const TIME_MARGIN_MS = 60_000;

const table = (model: string) => `${model}-${PROD_API_ID}-NONE`;

// A device gets at most one genre push in this window (a little under a day so a daily rhythm never drifts past it).
const GENRE_PUSH_GAP_MS = 20 * 60 * 60 * 1000;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// One page of follower user ids via the UserFollowedAuthor byAuthorId index (never a table scan).
async function getFollowersPage(authorId: string, startKey?: any): Promise<{ userIds: string[]; lastKey?: any }> {
    const result: any = await dynamo.send(new QueryCommand({
        TableName:                 table('UserFollowedAuthor'),
        IndexName:                 'byAuthorId',
        KeyConditionExpression:    'authorId = :aid',
        // A follower who switched this author's notifications off is skipped. A missing `notify` counts as ON.
        FilterExpression:          'attribute_not_exists(notify) OR notify <> :off',
        ExpressionAttributeValues: { ':aid': { S: authorId }, ':off': { BOOL: false } },
        ExclusiveStartKey:         startKey,
        Limit:                     200,
    }));
    return {
        userIds: (result.Items ?? []).map((i: any) => unmarshall(i).userId).filter(Boolean),
        lastKey: result.LastEvaluatedKey,
    };
}

// Devices (row id + push token) for a set of users via the UserDevice byUserId index, a few users at
// a time. Rows are returned as-is; sendPushNotifications de-duplicates by token.
type Device = { id: string; token: string; userId: string };
async function getDevices(userIds: string[]): Promise<Device[]> {
    const devices: Device[] = [];
    const CONCURRENCY = 20;
    for (let i = 0; i < userIds.length; i += CONCURRENCY) {
        const results = await Promise.all(userIds.slice(i, i + CONCURRENCY).map(async (userId) => {
            const found: Device[] = [];
            let lastKey: any;
            do {
                const res: any = await dynamo.send(new QueryCommand({
                    TableName:                 table('UserDevice'),
                    IndexName:                 'byUserId',
                    KeyConditionExpression:    'userId = :uid',
                    ExpressionAttributeValues: { ':uid': { S: userId } },
                    ExclusiveStartKey:         lastKey,
                }));
                for (const it of res.Items ?? []) {
                    const item = unmarshall(it);
                    if (item.pushToken && item.id) found.push({ id: item.id, token: item.pushToken, userId });
                }
                lastKey = res.LastEvaluatedKey;
            } while (lastKey);
            return found;
        }));
        results.forEach(r => devices.push(...r));
    }
    return devices;
}

// Expo reports tokens that no longer exist (app uninstalled, token revoked) as DeviceNotRegistered.
// Delete those rows so we stop pushing to them on every new story.
async function removeDeviceRows(ids: string[]): Promise<void> {
    for (const id of ids) {
        try {
            await dynamo.send(new DeleteItemCommand({ TableName: table('UserDevice'), Key: { id: { S: id } } }));
        } catch (err) {
            console.log('[notify-new-story] Failed to delete dead device row:', id, err);
        }
    }
}

// One Expo push request. Expo answers 429 when sent too fast and the odd 5xx: wait and try again (1s, 2s, 4s) instead
// of silently dropping the pushes. Gives up after 4 tries (logged) so one bad batch cannot stall the whole fan-out.
async function postToExpo(messages: any[]): Promise<any | null> {
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetch(EXPO_PUSH_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(messages),
                signal:  AbortSignal.timeout(20_000),
            });
            if (res.status === 429 || res.status >= 500) throw new Error(`Expo answered ${res.status}`);
            return await res.json().catch(() => null);
        } catch (err) {
            if (attempt === MAX_ATTEMPTS) {
                console.log('[notify-new-story] Expo push failed after retries:', err);
                return null;
            }
            await new Promise(r => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        }
    }
    return null;
}

async function sendPushNotifications(
    devices: Device[],
    title:   string,
    body:    string,
    storyId: string,
): Promise<number> {
    if (devices.length === 0) return 0;

    // One push per distinct token (a phone shared by two accounts can appear twice).
    const idsByToken = new Map<string, string[]>();
    for (const d of devices) {
        const ids = idsByToken.get(d.token) ?? [];
        ids.push(d.id);
        idsByToken.set(d.token, ids);
    }
    const tokens = Array.from(idsByToken.keys());

    const BATCH_SIZE = 100;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const messages = batch.map(token => ({
            to:    token,
            title,
            body,
            data:  { storyId },
            sound: 'default',
        }));

        const json: any = await postToExpo(messages);
        // Log counts and the first few errors only: a big fan-out sends thousands of batches.
        const failed = (json?.data ?? []).filter((t: any) => t?.status === 'error');
        console.log(`[notify-new-story] Expo batch: ${batch.length} sent, ${failed.length} error(s)`, failed.length ? JSON.stringify(failed.slice(0, 3)) : '');

        // Tickets come back in the same order as the messages we sent.
        const dead: string[] = [];
        (json?.data ?? []).forEach((ticket: any, idx: number) => {
            if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
                dead.push(...(idsByToken.get(batch[idx]) ?? []));
            }
        });
        if (dead.length > 0) {
            await removeDeviceRows(dead);
            console.log(`[notify-new-story] Removed ${dead.length} dead device row(s)`);
        }
    }
    console.log(`[notify-new-story] Sent to ${tokens.length} device(s)`);
    return tokens.length;
}

// ---------------------------------------------------------------------------
// Genre helpers
// ---------------------------------------------------------------------------

// Tag ids on a story (a handful), sorted so a continuation message resumes at the same position.
async function getStoryTagIds(storyId: string): Promise<string[]> {
    const ids = new Set<string>();
    let lastKey: any;
    do {
        const res: any = await dynamo.send(new QueryCommand({
            TableName:                 table('StoryTag'),
            IndexName:                 'byStoryId',
            KeyConditionExpression:    'storyId = :sid',
            ExpressionAttributeValues: { ':sid': { S: storyId } },
            ExclusiveStartKey:         lastKey,
        }));
        for (const it of res.Items ?? []) { const t = unmarshall(it).tagId; if (t) ids.add(t); }
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return Array.from(ids).sort();
}

async function getTag(tagId: string): Promise<{ name: string; isErotic: boolean } | null> {
    const res: any = await dynamo.send(new GetItemCommand({ TableName: table('Tag'), Key: { id: { S: tagId } } }));
    if (!res.Item) return null;
    const t = unmarshall(res.Item);
    return { name: t.name ?? '', isErotic: t.isErotic === true };
}

// One page of people following a tag with notifications on. A missing `notify` counts as ON.
async function getTagFollowersPage(tagId: string, startKey?: any): Promise<{ userIds: string[]; lastKey?: any }> {
    const result: any = await dynamo.send(new QueryCommand({
        TableName:                 table('UserFollowedTag'),
        IndexName:                 'byTagId',
        KeyConditionExpression:    'tagId = :tid',
        FilterExpression:          'attribute_not_exists(notify) OR notify <> :off',
        ExpressionAttributeValues: { ':tid': { S: tagId }, ':off': { BOOL: false } },
        ExclusiveStartKey:         startKey,
        Limit:                     200,
    }));
    return {
        userIds: (result.Items ?? []).map((i: any) => unmarshall(i).userId).filter(Boolean),
        lastKey: result.LastEvaluatedKey,
    };
}

// True when the person follows the author with notifications ON (so the author push covers them).
async function followsAuthor(userId: string, authorId: string): Promise<boolean> {
    const res: any = await dynamo.send(new QueryCommand({
        TableName:                 table('UserFollowedAuthor'),
        IndexName:                 'byUserAndAuthor',
        KeyConditionExpression:    'userId = :u AND authorId = :a',
        ExpressionAttributeValues: { ':u': { S: userId }, ':a': { S: authorId } },
        Limit:                     1,
    }));
    // Following with this author's notifications switched off means the author push did not reach them.
    const item = (res.Items ?? [])[0];
    return !!item && unmarshall(item).notify !== false;
}

// Take this device's genre-push slot for the day. Only one concurrent run can win it, so a person following
// several genres of the same story (or two stories published together) still gets one note.
async function claimGenreSlot(deviceId: string): Promise<boolean> {
    const now = new Date();
    try {
        await dynamo.send(new UpdateItemCommand({
            TableName:                 table('UserDevice'),
            Key:                       { id: { S: deviceId } },
            UpdateExpression:          'SET lastGenrePushAt = :now',
            ConditionExpression:       'attribute_exists(id) AND (attribute_not_exists(lastGenrePushAt) OR lastGenrePushAt < :cutoff)',
            ExpressionAttributeValues: {
                ':now':    { S: now.toISOString() },
                ':cutoff': { S: new Date(now.getTime() - GENRE_PUSH_GAP_MS).toISOString() },
            },
        }));
        return true;
    } catch (err: any) {
        if (err?.name !== 'ConditionalCheckFailedException') console.log('[notify-new-story] claimGenreSlot failed:', deviceId, err);
        return false;
    }
}

// Mark this device as told about this story's author push. Only the first run to mark it wins, so a message the queue
// delivers twice (or a run that timed out and is retried) never pushes the same story to the same device twice.
async function claimAuthorPush(deviceId: string, storyId: string): Promise<boolean> {
    try {
        await dynamo.send(new UpdateItemCommand({
            TableName:                 table('UserDevice'),
            Key:                       { id: { S: deviceId } },
            UpdateExpression:          'SET lastAuthorPushStoryId = :s',
            ConditionExpression:       'attribute_exists(id) AND (attribute_not_exists(lastAuthorPushStoryId) OR lastAuthorPushStoryId <> :s)',
            ExpressionAttributeValues: { ':s': { S: storyId } },
        }));
        return true;
    } catch (err: any) {
        if (err?.name !== 'ConditionalCheckFailedException') console.log('[notify-new-story] claimAuthorPush failed:', deviceId, err);
        return false;
    }
}

async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
    const out: R[] = [];
    for (let i = 0; i < items.length; i += size) out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
    return out;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

type Msg = {
    storyId?: string; authorId?: string; title?: string; isErotic?: string;
    phase?: 'author' | 'genre'; tagIdx?: number; cursor?: string;
};

export const handler: SQSHandler = async (event, context) => {
    for (const record of event.Records) {
        let message: Msg;
        try {
            message = JSON.parse(record.body);
        } catch (err) {
            console.log('[notify-new-story] Failed to parse SQS message body:', record.body);
            continue;
        }

        const { storyId, authorId, title, isErotic, cursor } = message;
        const phase = message.phase ?? 'author';

        if (isErotic === 'true') {
            console.log('[notify-new-story] Skipping erotic story:', storyId);
            continue;
        }
        if (!authorId) {
            console.log('[notify-new-story] Missing authorId, skipping:', storyId);
            continue;
        }
        if (!storyId) {
            console.log('[notify-new-story] Missing storyId, skipping');
            continue;
        }

        const storyTitle = title ?? 'New Story';
        console.log(`[notify-new-story] Processing story: "${storyTitle}" (${storyId}) phase=${phase}`);

        const queueContinuation = async (next: Msg, reason: string) => {
            const [, , , region, account, queueName] = record.eventSourceARN.split(':');
            await sqs.send(new SendMessageCommand({
                QueueUrl:     `https://sqs.${region}.amazonaws.com/${account}/${queueName}`,
                DelaySeconds: 0,
                MessageBody:  JSON.stringify({ storyId, authorId, title, isErotic, ...next }),
            }));
            console.log(`[notify-new-story] ${reason}, continuation queued for`, storyId, next.phase);
        };

        let authorName = 'an author you follow';
        try {
            const authorResult = await dynamo.send(new GetItemCommand({
                TableName: table('Author'),
                Key:       { id: { S: authorId } },
            }));
            if (authorResult.Item) {
                authorName = unmarshall(authorResult.Item).name ?? authorName;
            } else {
                console.log('[notify-new-story] No author found for authorId:', authorId);
            }
        } catch (err) {
            console.log('[notify-new-story] Author lookup failed:', err);
        }

        // ── AUTHOR phase ────────────────────────────────────────────────────
        // Walk followers page by page: look up their tokens and push immediately, so memory stays flat no
        // matter how many followers the author has.
        if (phase === 'author') {
            let lastKey: any = cursor ? JSON.parse(cursor) : undefined;
            let followerCount = 0;
            let deviceCount = 0;
            let paused = false;
            do {
                const page = await getFollowersPage(authorId, lastKey);
                lastKey = page.lastKey;
                followerCount += page.userIds.length;
                if (page.userIds.length === 0) continue;
                const found = await getDevices(page.userIds);
                const devices = (await inBatches(found, 20, async (d) => (await claimAuthorPush(d.id, storyId)) ? d : null))
                    .filter((d): d is Device => d !== null);
                deviceCount += await sendPushNotifications(
                    devices,
                    `New story from ${authorName}`,
                    `"${storyTitle}" is now available to listen`,
                    storyId,
                );
                if (lastKey && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                    await queueContinuation({ phase: 'author', cursor: JSON.stringify(lastKey) }, 'Time budget reached');
                    paused = true;
                    break;
                }
            } while (lastKey);
            console.log(`[notify-new-story] ${followerCount} follower(s), ${deviceCount} device(s) notified`);
            if (paused) continue;
            // Author followers are done: carry on with the genres in a fresh message (fresh time budget).
            await queueContinuation({ phase: 'genre', tagIdx: 0 }, 'Author followers done, genres next');
            continue;
        }

        // ── GENRE phase ─────────────────────────────────────────────────────
        const tagIds = await getStoryTagIds(storyId);
        let tagIdx = message.tagIdx ?? 0;
        let lastKey: any = cursor ? JSON.parse(cursor) : undefined;
        // People already handled under an earlier genre of this story in this run (a person following several of its
        // genres is looked up once). Bounded so memory stays flat; the daily cap still guarantees one push either way.
        const handled = new Set<string>();
        while (tagIdx < tagIds.length) {
            const tagId = tagIds[tagIdx];
            const tag = await getTag(tagId);
            if (!tag || !tag.name || tag.isErotic) {
                tagIdx++; lastKey = undefined;
                continue;
            }
            let notified = 0;
            let paused = false;
            do {
                const page = await getTagFollowersPage(tagId, lastKey);
                lastKey = page.lastKey;
                const fresh = page.userIds.filter(u => !handled.has(u));
                if (handled.size < 200_000) fresh.forEach(u => handled.add(u));
                if (fresh.length > 0) {
                    const devices = await getDevices(fresh);
                    // Anyone whose author push was just delivered already knows about this story.
                    const userIds = Array.from(new Set(devices.map(d => d.userId)));
                    const covered = new Set<string>();
                    await inBatches(userIds, 20, async (u) => { if (await followsAuthor(u, authorId)) covered.add(u); });
                    const candidates = devices.filter(d => !covered.has(d.userId));
                    const claimed = (await inBatches(candidates, 20, async (d) => (await claimGenreSlot(d.id)) ? d : null))
                        .filter((d): d is Device => d !== null);
                    notified += await sendPushNotifications(
                        claimed,
                        `New in ${tag.name}`,
                        `"${storyTitle}" by ${authorName}`,
                        storyId,
                    );
                }
                if (lastKey && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                    await queueContinuation({ phase: 'genre', tagIdx, cursor: JSON.stringify(lastKey) }, 'Time budget reached');
                    paused = true;
                    break;
                }
            } while (lastKey);
            console.log(`[notify-new-story] genre "${tag.name}": ${notified} device(s) notified`);
            if (paused) break;
            tagIdx++; lastKey = undefined;
            if (tagIdx < tagIds.length && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                await queueContinuation({ phase: 'genre', tagIdx }, 'Time budget reached');
                break;
            }
        }
    }
};
