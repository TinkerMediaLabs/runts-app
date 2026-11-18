"use strict";
/**
 * notify-new-story Lambda
 *
 * Triggered by SQS (runts-notify-new-story-queue).
 * Each message body contains: { storyId, authorId, title, isErotic }
 * queued by the runts-notify-story-stream Lambda when a story's
 * `live` field flips from 'false' to 'true'.
 *
 *   1. Skip erotic stories
 *   2. AUTHOR phase: find all users following the story's author, find their push tokens from the UserDevice
 *      table (skipping devices that muted author pushes), send via the Expo Push API
 *   3. GENRE phase: for each (non-erotic) tag on the story, page through the people following that tag with
 *      notifications on (UserFollowedTag byTagId). Skip anyone the author push already reached, and cap each
 *      device at one genre push a day with a conditional write on UserDevice.lastGenrePushAt.
 *
 * Both phases walk pages (never a scan, flat memory) and hand the rest to a continuation message when the run
 * time is nearly up, so any number of followers is covered.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const REGION = 'us-east-2';
const PROD_API_ID = 'nzvkuznrzjfc5kud3vfik5j7ey';
const dynamo = new client_dynamodb_1.DynamoDBClient({ region: REGION });
const sqs = new client_sqs_1.SQSClient({ region: REGION });
// Stop starting new follower pages when less than this much run time is left, and hand the rest
// to a continuation message instead, so a big follower list is never cut off mid-way by a timeout.
const TIME_MARGIN_MS = 60000;
const table = (model) => `${model}-${PROD_API_ID}-NONE`;
// A device gets at most one genre push in this window (a little under a day so a daily rhythm never drifts past it).
const GENRE_PUSH_GAP_MS = 20 * 60 * 60 * 1000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// One page of follower user ids via the UserFollowedAuthor byAuthorId index (never a table scan).
async function getFollowersPage(authorId, startKey) {
    const result = await dynamo.send(new client_dynamodb_1.QueryCommand({
        TableName: table('UserFollowedAuthor'),
        IndexName: 'byAuthorId',
        KeyConditionExpression: 'authorId = :aid',
        ExpressionAttributeValues: { ':aid': { S: authorId } },
        ExclusiveStartKey: startKey,
        Limit: 200,
    }));
    return {
        userIds: (result.Items ?? []).map((i) => (0, util_dynamodb_1.unmarshall)(i).userId).filter(Boolean),
        lastKey: result.LastEvaluatedKey,
    };
}
async function getDevices(userIds) {
    const devices = [];
    const CONCURRENCY = 10;
    for (let i = 0; i < userIds.length; i += CONCURRENCY) {
        const results = await Promise.all(userIds.slice(i, i + CONCURRENCY).map(async (userId) => {
            const found = [];
            let lastKey;
            do {
                const res = await dynamo.send(new client_dynamodb_1.QueryCommand({
                    TableName: table('UserDevice'),
                    IndexName: 'byUserId',
                    KeyConditionExpression: 'userId = :uid',
                    ExpressionAttributeValues: { ':uid': { S: userId } },
                    ExclusiveStartKey: lastKey,
                }));
                for (const it of res.Items ?? []) {
                    const item = (0, util_dynamodb_1.unmarshall)(it);
                    if (item.pushToken && item.id)
                        found.push({ id: item.id, token: item.pushToken, userId, muteAuthors: item.muteAuthors === true });
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
async function removeDeviceRows(ids) {
    for (const id of ids) {
        try {
            await dynamo.send(new client_dynamodb_1.DeleteItemCommand({ TableName: table('UserDevice'), Key: { id: { S: id } } }));
        }
        catch (err) {
            console.log('[notify-new-story] Failed to delete dead device row:', id, err);
        }
    }
}
async function sendPushNotifications(devices, title, body, storyId) {
    if (devices.length === 0)
        return 0;
    // One push per distinct token (a phone shared by two accounts can appear twice).
    const idsByToken = new Map();
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
            to: token,
            title,
            body,
            data: { storyId },
            sound: 'default',
        }));
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });
        const json = await res.json().catch(() => null);
        console.log('[notify-new-story] Expo push response:', JSON.stringify(json));
        // Tickets come back in the same order as the messages we sent.
        const dead = [];
        (json?.data ?? []).forEach((ticket, idx) => {
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
async function getStoryTagIds(storyId) {
    const ids = new Set();
    let lastKey;
    do {
        const res = await dynamo.send(new client_dynamodb_1.QueryCommand({
            TableName: table('StoryTag'),
            IndexName: 'byStoryId',
            KeyConditionExpression: 'storyId = :sid',
            ExpressionAttributeValues: { ':sid': { S: storyId } },
            ExclusiveStartKey: lastKey,
        }));
        for (const it of res.Items ?? []) {
            const t = (0, util_dynamodb_1.unmarshall)(it).tagId;
            if (t)
                ids.add(t);
        }
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return Array.from(ids).sort();
}
async function getTag(tagId) {
    const res = await dynamo.send(new client_dynamodb_1.GetItemCommand({ TableName: table('Tag'), Key: { id: { S: tagId } } }));
    if (!res.Item)
        return null;
    const t = (0, util_dynamodb_1.unmarshall)(res.Item);
    return { name: t.name ?? '', isErotic: t.isErotic === true };
}
// One page of people following a tag with notifications on. A missing `notify` counts as ON.
async function getTagFollowersPage(tagId, startKey) {
    const result = await dynamo.send(new client_dynamodb_1.QueryCommand({
        TableName: table('UserFollowedTag'),
        IndexName: 'byTagId',
        KeyConditionExpression: 'tagId = :tid',
        FilterExpression: 'attribute_not_exists(notify) OR notify <> :off',
        ExpressionAttributeValues: { ':tid': { S: tagId }, ':off': { BOOL: false } },
        ExclusiveStartKey: startKey,
        Limit: 200,
    }));
    return {
        userIds: (result.Items ?? []).map((i) => (0, util_dynamodb_1.unmarshall)(i).userId).filter(Boolean),
        lastKey: result.LastEvaluatedKey,
    };
}
async function followsAuthor(userId, authorId) {
    const res = await dynamo.send(new client_dynamodb_1.QueryCommand({
        TableName: table('UserFollowedAuthor'),
        IndexName: 'byUserAndAuthor',
        KeyConditionExpression: 'userId = :u AND authorId = :a',
        ExpressionAttributeValues: { ':u': { S: userId }, ':a': { S: authorId } },
        Limit: 1,
    }));
    return (res.Items ?? []).length > 0;
}
// Take this device's genre-push slot for the day. Only one concurrent run can win it, so a person following
// several genres of the same story (or two stories published together) still gets one note.
async function claimGenreSlot(deviceId) {
    const now = new Date();
    try {
        await dynamo.send(new client_dynamodb_1.UpdateItemCommand({
            TableName: table('UserDevice'),
            Key: { id: { S: deviceId } },
            UpdateExpression: 'SET lastGenrePushAt = :now',
            ConditionExpression: 'attribute_exists(id) AND (attribute_not_exists(lastGenrePushAt) OR lastGenrePushAt < :cutoff)',
            ExpressionAttributeValues: {
                ':now': { S: now.toISOString() },
                ':cutoff': { S: new Date(now.getTime() - GENRE_PUSH_GAP_MS).toISOString() },
            },
        }));
        return true;
    }
    catch (err) {
        if (err?.name !== 'ConditionalCheckFailedException')
            console.log('[notify-new-story] claimGenreSlot failed:', deviceId, err);
        return false;
    }
}
async function inBatches(items, size, fn) {
    const out = [];
    for (let i = 0; i < items.length; i += size)
        out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
    return out;
}
const handler = async (event, context) => {
    for (const record of event.Records) {
        let message;
        try {
            message = JSON.parse(record.body);
        }
        catch (err) {
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
        const queueContinuation = async (next, reason) => {
            const [, , , region, account, queueName] = record.eventSourceARN.split(':');
            await sqs.send(new client_sqs_1.SendMessageCommand({
                QueueUrl: `https://sqs.${region}.amazonaws.com/${account}/${queueName}`,
                DelaySeconds: 0,
                MessageBody: JSON.stringify({ storyId, authorId, title, isErotic, ...next }),
            }));
            console.log(`[notify-new-story] ${reason}, continuation queued for`, storyId, next.phase);
        };
        let authorName = 'an author you follow';
        try {
            const authorResult = await dynamo.send(new client_dynamodb_1.GetItemCommand({
                TableName: table('Author'),
                Key: { id: { S: authorId } },
            }));
            if (authorResult.Item) {
                authorName = (0, util_dynamodb_1.unmarshall)(authorResult.Item).name ?? authorName;
            }
            else {
                console.log('[notify-new-story] No author found for authorId:', authorId);
            }
        }
        catch (err) {
            console.log('[notify-new-story] Author lookup failed:', err);
        }
        // ── AUTHOR phase ────────────────────────────────────────────────────
        // Walk followers page by page: look up their tokens and push immediately, so memory stays flat no
        // matter how many followers the author has.
        if (phase === 'author') {
            let lastKey = cursor ? JSON.parse(cursor) : undefined;
            let followerCount = 0;
            let deviceCount = 0;
            let paused = false;
            do {
                const page = await getFollowersPage(authorId, lastKey);
                lastKey = page.lastKey;
                followerCount += page.userIds.length;
                if (page.userIds.length === 0)
                    continue;
                const devices = (await getDevices(page.userIds)).filter(d => !d.muteAuthors);
                deviceCount += await sendPushNotifications(devices, `New story from ${authorName}`, `"${storyTitle}" is now available to listen`, storyId);
                if (lastKey && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                    await queueContinuation({ phase: 'author', cursor: JSON.stringify(lastKey) }, 'Time budget reached');
                    paused = true;
                    break;
                }
            } while (lastKey);
            console.log(`[notify-new-story] ${followerCount} follower(s), ${deviceCount} device(s) notified`);
            if (paused)
                continue;
            // Author followers are done: carry on with the genres in a fresh message (fresh time budget).
            await queueContinuation({ phase: 'genre', tagIdx: 0 }, 'Author followers done, genres next');
            continue;
        }
        // ── GENRE phase ─────────────────────────────────────────────────────
        const tagIds = await getStoryTagIds(storyId);
        let tagIdx = message.tagIdx ?? 0;
        let lastKey = cursor ? JSON.parse(cursor) : undefined;
        while (tagIdx < tagIds.length) {
            const tagId = tagIds[tagIdx];
            const tag = await getTag(tagId);
            if (!tag || !tag.name || tag.isErotic) {
                tagIdx++;
                lastKey = undefined;
                continue;
            }
            let notified = 0;
            let paused = false;
            do {
                const page = await getTagFollowersPage(tagId, lastKey);
                lastKey = page.lastKey;
                if (page.userIds.length > 0) {
                    const devices = await getDevices(page.userIds);
                    // Anyone whose author push was just delivered already knows about this story.
                    const userIds = Array.from(new Set(devices.map(d => d.userId)));
                    const covered = new Set();
                    await inBatches(userIds, 10, async (u) => { if (await followsAuthor(u, authorId))
                        covered.add(u); });
                    const candidates = devices.filter(d => !(covered.has(d.userId) && !d.muteAuthors));
                    const claimed = (await inBatches(candidates, 10, async (d) => (await claimGenreSlot(d.id)) ? d : null))
                        .filter((d) => d !== null);
                    notified += await sendPushNotifications(claimed, `New in ${tag.name}`, `"${storyTitle}" by ${authorName}`, storyId);
                }
                if (lastKey && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                    await queueContinuation({ phase: 'genre', tagIdx, cursor: JSON.stringify(lastKey) }, 'Time budget reached');
                    paused = true;
                    break;
                }
            } while (lastKey);
            console.log(`[notify-new-story] genre "${tag.name}": ${notified} device(s) notified`);
            if (paused)
                break;
            tagIdx++;
            lastKey = undefined;
            if (tagIdx < tagIds.length && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                await queueContinuation({ phase: 'genre', tagIdx }, 'Time budget reached');
                break;
            }
        }
    }
};
exports.handler = handler;
