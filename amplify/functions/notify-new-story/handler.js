"use strict";
/**
 * notify-new-story Lambda
 *
 * Triggered by DynamoDB Stream on the Story table.
 * When a story's `live` field changes from 'false' to 'true':
 *   1. Skip erotic stories
 *   2. Find all users following the story's author
 *   3. Find their push tokens from UserDevice table
 *   4. Send push notifications via Expo Push API
 *
 * 1-hour delay is handled by EventBridge Scheduler (created separately)
 * or by checking publishedAt timestamp in the handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const REGION = 'us-east-2';
const PROD_API_ID = 'nzvkuznrzjfc5kud3vfik5j7ey';
const dynamo = new client_dynamodb_1.DynamoDBClient({ region: REGION });
const table = (model) => `${model}-${PROD_API_ID}-NONE`;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getFollowers(authorId) {
    const result = await dynamo.send(new client_dynamodb_1.ScanCommand({
        TableName: table('UserFollowedAuthor'),
        FilterExpression: 'authorId = :aid',
        ExpressionAttributeValues: { ':aid': { S: authorId } },
    }));
    return (result.Items ?? [])
        .map(i => (0, util_dynamodb_1.unmarshall)(i).userId)
        .filter(Boolean);
}
async function getPushTokens(userIds) {
    const tokens = [];
    for (const userId of userIds) {
        const result = await dynamo.send(new client_dynamodb_1.ScanCommand({
            TableName: table('UserDevice'),
            FilterExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': { S: userId } },
        }));
        const items = (result.Items ?? []).map(i => (0, util_dynamodb_1.unmarshall)(i));
        items.forEach(item => {
            if (item.pushToken)
                tokens.push(item.pushToken);
        });
    }
    return tokens;
}
async function sendPushNotifications(tokens, title, body, storyId) {
    if (tokens.length === 0)
        return;
    // Expo push API accepts batches of up to 100
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
        await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });
    }
    console.log(`[notify-new-story] Sent to ${tokens.length} device(s)`);
}
// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
const handler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName !== 'MODIFY')
            continue;
        const oldImage = record.dynamodb?.OldImage;
        const newImage = record.dynamodb?.NewImage;
        if (!oldImage || !newImage)
            continue;
        const oldStory = (0, util_dynamodb_1.unmarshall)(oldImage);
        const newStory = (0, util_dynamodb_1.unmarshall)(newImage);
        // Only fire when live flips from false → true
        if (oldStory.live === 'true' || newStory.live !== 'true')
            continue;
        // Skip erotic stories
        if (newStory.isErotic === 'true') {
            console.log('[notify-new-story] Skipping erotic story:', newStory.id);
            continue;
        }
        const authorId = newStory.authorId;
        if (!authorId)
            continue;
        const storyTitle = newStory.title ?? 'New Story';
        const storyId = newStory.id;
        console.log(`[notify-new-story] Story went live: "${storyTitle}" (${storyId})`);
        // Get followers
        const followerIds = await getFollowers(authorId);
        if (followerIds.length === 0) {
            console.log('[notify-new-story] No followers found');
            continue;
        }
        console.log(`[notify-new-story] Found ${followerIds.length} follower(s)`);
        // Get push tokens
        const tokens = await getPushTokens(followerIds);
        if (tokens.length === 0) {
            console.log('[notify-new-story] No push tokens found');
            continue;
        }
        // Get author name for notification body
        let authorName = 'An author you follow';
        try {
            const authorResult = await dynamo.send(new client_dynamodb_1.ScanCommand({
                TableName: table('Author'),
                FilterExpression: 'id = :aid',
                ExpressionAttributeValues: { ':aid': { S: authorId } },
                Limit: 1,
            }));
            if (authorResult.Items?.[0]) {
                authorName = (0, util_dynamodb_1.unmarshall)(authorResult.Items[0]).name ?? authorName;
            }
        }
        catch { /* use default */ }
        // Send notifications
        await sendPushNotifications(tokens, `New story from ${authorName}`, `"${storyTitle}" is now available to listen`, storyId);
    }
};
exports.handler = handler;
