/**
 * notify-new-story Lambda
 *
 * Triggered by SQS (runts-notify-new-story-queue).
 * Each message body contains: { storyId, authorId, title, isErotic }
 * queued by the runts-notify-story-stream Lambda when a story's
 * `live` field flips from 'false' to 'true'.
 *
 *   1. Skip erotic stories
 *   2. Find all users following the story's author
 *   3. Find their push tokens from UserDevice table
 *   4. Send push notifications via Expo Push API
 */

import { SQSHandler } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
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
        ExpressionAttributeValues: { ':aid': { S: authorId } },
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
type Device = { id: string; token: string };
async function getDevices(userIds: string[]): Promise<Device[]> {
    const devices: Device[] = [];
    const CONCURRENCY = 10;
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
                    if (item.pushToken && item.id) found.push({ id: item.id, token: item.pushToken });
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

        const res = await fetch(EXPO_PUSH_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(messages),
        });
        const json: any = await res.json().catch(() => null);
        console.log('[notify-new-story] Expo push response:', JSON.stringify(json));

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
// Handler
// ---------------------------------------------------------------------------

export const handler: SQSHandler = async (event, context) => {
    for (const record of event.Records) {
        let message: { storyId?: string; authorId?: string; title?: string; isErotic?: string; cursor?: string };
        try {
            message = JSON.parse(record.body);
        } catch (err) {
            console.log('[notify-new-story] Failed to parse SQS message body:', record.body);
            continue;
        }

        const { storyId, authorId, title, isErotic, cursor } = message;

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

        console.log(`[notify-new-story] Processing story: "${storyTitle}" (${storyId})`);

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
        // Walk followers page by page: look up their tokens and push immediately, so memory stays
        // flat no matter how many followers the author has.
        let lastKey: any = cursor ? JSON.parse(cursor) : undefined;
        let followerCount = 0;
        let deviceCount = 0;
        do {
            const page = await getFollowersPage(authorId, lastKey);
            lastKey = page.lastKey;
            followerCount += page.userIds.length;
            if (page.userIds.length === 0) continue;
            const devices = await getDevices(page.userIds);
            deviceCount += await sendPushNotifications(
                devices,
                `New story from ${authorName}`,
                `"${storyTitle}" is now available to listen`,
                storyId,
            );
            if (lastKey && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                const [, , , region, account, queueName] = record.eventSourceARN.split(':');
                await sqs.send(new SendMessageCommand({
                    QueueUrl:     `https://sqs.${region}.amazonaws.com/${account}/${queueName}`,
                    DelaySeconds: 0,
                    MessageBody:  JSON.stringify({ storyId, authorId, title, isErotic, cursor: JSON.stringify(lastKey) }),
                }));
                console.log('[notify-new-story] Time budget reached, continuation queued for', storyId);
                break;
            }
        } while (lastKey);
        console.log(`[notify-new-story] ${followerCount} follower(s), ${deviceCount} device(s) notified`);
    }
};