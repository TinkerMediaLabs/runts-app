/**
 * notify-story-stream Lambda (deployed as runts-notify-story-stream)
 *
 * Triggered by the production Story table's DynamoDB stream.
 * When a story's `live` flips from not-'true' to 'true' (and it is not erotic) it queues ONE
 * message on runts-notify-new-story-queue; the notify-new-story Lambda then fans out to followers.
 */

import type { DynamoDBStreamHandler } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs       = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.QUEUE_URL;

export const handler: DynamoDBStreamHandler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName !== 'MODIFY') continue;

        const oldImage: any = record.dynamodb?.OldImage;
        const newImage: any = record.dynamodb?.NewImage;
        if (!oldImage || !newImage) continue;

        // Only process when live flips to 'true'
        if (oldImage.live?.S === 'true' || newImage.live?.S !== 'true') continue;

        // Skip erotic
        if (newImage.isErotic?.S === 'true') continue;

        console.log('Story went live, queueing notification:', newImage.id?.S);

        await sqs.send(new SendMessageCommand({
            QueueUrl:    QUEUE_URL,
            MessageBody: JSON.stringify({
                storyId:  newImage.id?.S,
                authorId: newImage.authorId?.S,
                title:    newImage.title?.S,
                isErotic: newImage.isErotic?.S,
            }),
        }));
    }
};
