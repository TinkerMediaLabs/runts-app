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
import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const REGION      = 'us-east-2';
const PROD_API_ID = 'nzvkuznrzjfc5kud3vfik5j7ey';

const dynamo = new DynamoDBClient({ region: REGION });

const table = (model: string) => `${model}-${PROD_API_ID}-NONE`;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getFollowers(authorId: string): Promise<string[]> {
    const result = await dynamo.send(new ScanCommand({
        TableName:                 table('UserFollowedAuthor'),
        FilterExpression:          'authorId = :aid',
        ExpressionAttributeValues: { ':aid': { S: authorId } },
    }));
    return (result.Items ?? [])
        .map(i => unmarshall(i).userId)
        .filter(Boolean);
}

async function getPushTokens(userIds: string[]): Promise<string[]> {
    const tokens: string[] = [];
    for (const userId of userIds) {
        const result = await dynamo.send(new ScanCommand({
            TableName:                 table('UserDevice'),
            FilterExpression:          'userId = :uid',
            ExpressionAttributeValues: { ':uid': { S: userId } },
        }));
        const items = (result.Items ?? []).map(i => unmarshall(i));
        items.forEach(item => {
            if (item.pushToken) tokens.push(item.pushToken);
        });
    }
    return tokens;
}

async function sendPushNotifications(
    tokens:  string[],
    title:   string,
    body:    string,
    storyId: string,
): Promise<void> {
    if (tokens.length === 0) return;

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
        const json = await res.json().catch(() => null);
        console.log('[notify-new-story] Expo push response:', JSON.stringify(json));
    }
    console.log(`[notify-new-story] Sent to ${tokens.length} device(s)`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: SQSHandler = async (event) => {
    for (const record of event.Records) {
        let message: { storyId?: string; authorId?: string; title?: string; isErotic?: string };
        try {
            message = JSON.parse(record.body);
        } catch (err) {
            console.log('[notify-new-story] Failed to parse SQS message body:', record.body);
            continue;
        }

        const { storyId, authorId, title, isErotic } = message;

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

        const followerIds = await getFollowers(authorId);
        if (followerIds.length === 0) {
            console.log('[notify-new-story] No followers found');
            continue;
        }

        console.log(`[notify-new-story] Found ${followerIds.length} follower(s)`);

        const tokens = await getPushTokens(followerIds);
        if (tokens.length === 0) {
            console.log('[notify-new-story] No push tokens found');
            continue;
        }

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
        await sendPushNotifications(
            tokens,
            `New story from ${authorName}`,
            `"${storyTitle}" is now available to listen`,
            storyId,
        );
    }
};