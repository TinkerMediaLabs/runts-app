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
 *   2. Find all users following the story's author
 *   3. Find their push tokens from UserDevice table
 *   4. Send push notifications via Expo Push API
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
// Push tokens for a set of users via the UserDevice byUserId index, a few users at a time.
async function getPushTokens(userIds) {
    const tokens = [];
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
                    if (item.pushToken)
                        found.push(item.pushToken);
                }
                lastKey = res.LastEvaluatedKey;
            } while (lastKey);
            return found;
        }));
        results.forEach(r => tokens.push(...r));
    }
    return tokens;
}
async function sendPushNotifications(tokens, title, body, storyId) {
    if (tokens.length === 0)
        return;
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
    }
    console.log(`[notify-new-story] Sent to ${tokens.length} device(s)`);
}
// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
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
        // Walk followers page by page: look up their tokens and push immediately, so memory stays
        // flat no matter how many followers the author has.
        let lastKey = cursor ? JSON.parse(cursor) : undefined;
        let followerCount = 0;
        let deviceCount = 0;
        do {
            const page = await getFollowersPage(authorId, lastKey);
            lastKey = page.lastKey;
            followerCount += page.userIds.length;
            if (page.userIds.length === 0)
                continue;
            const tokens = await getPushTokens(page.userIds);
            deviceCount += tokens.length;
            await sendPushNotifications(tokens, `New story from ${authorName}`, `"${storyTitle}" is now available to listen`, storyId);
            if (lastKey && context.getRemainingTimeInMillis() < TIME_MARGIN_MS) {
                const [, , , region, account, queueName] = record.eventSourceARN.split(':');
                await sqs.send(new client_sqs_1.SendMessageCommand({
                    QueueUrl: `https://sqs.${region}.amazonaws.com/${account}/${queueName}`,
                    DelaySeconds: 0,
                    MessageBody: JSON.stringify({ storyId, authorId, title, isErotic, cursor: JSON.stringify(lastKey) }),
                }));
                console.log('[notify-new-story] Time budget reached, continuation queued for', storyId);
                break;
            }
        } while (lastKey);
        console.log(`[notify-new-story] ${followerCount} follower(s), ${deviceCount} device(s) notified`);
    }
};
exports.handler = handler;
