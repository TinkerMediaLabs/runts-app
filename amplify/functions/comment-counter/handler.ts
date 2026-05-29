import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamo = new DynamoDBClient({});
const STORY_TABLE = process.env.STORY_TABLE_NAME!;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: DynamoDBRecord) {
  const eventName = record.eventName;

  // MODIFY = edit, count unchanged. Only INSERT and REMOVE affect count.
  if (eventName !== 'INSERT' && eventName !== 'REMOVE') return;

  const image = eventName === 'INSERT'
    ? unmarshall(record.dynamodb?.NewImage as any)
    : unmarshall(record.dynamodb?.OldImage as any);

  const delta = eventName === 'INSERT' ? 1 : -1;

  await dynamo.send(new UpdateItemCommand({
    TableName: STORY_TABLE,
    Key: { id: { S: image.storyId } },
    UpdateExpression: 'ADD numComments :delta',
    ExpressionAttributeValues: { ':delta': { N: delta.toString() } },
  }));
}