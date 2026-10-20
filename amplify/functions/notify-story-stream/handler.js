"use strict";
/**
 * notify-story-stream Lambda (deployed as runts-notify-story-stream)
 *
 * Triggered by the production Story table's DynamoDB stream.
 * When a story's `live` flips from not-'true' to 'true' (and it is not erotic) it queues ONE
 * message on runts-notify-new-story-queue; the notify-new-story Lambda then fans out to followers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const sqs = new client_sqs_1.SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.QUEUE_URL;
const handler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName !== 'MODIFY')
            continue;
        const oldImage = record.dynamodb?.OldImage;
        const newImage = record.dynamodb?.NewImage;
        if (!oldImage || !newImage)
            continue;
        // Only process when live flips to 'true'
        if (oldImage.live?.S === 'true' || newImage.live?.S !== 'true')
            continue;
        // Skip erotic
        if (newImage.isErotic?.S === 'true')
            continue;
        console.log('Story went live, queueing notification:', newImage.id?.S);
        await sqs.send(new client_sqs_1.SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
                storyId: newImage.id?.S,
                authorId: newImage.authorId?.S,
                title: newImage.title?.S,
                isErotic: newImage.isErotic?.S,
            }),
        }));
    }
};
exports.handler = handler;
