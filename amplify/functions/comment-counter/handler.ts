import { DynamoDBClient, UpdateItemCommand, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamo = new DynamoDBClient({});
const STORY_TABLE = process.env.STORY_TABLE_NAME!;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      console.error('comment-counter error:', JSON.stringify(err));
    }
  }
};

async function processRecord(record: DynamoDBRecord) {
  const eventName = record.eventName;
  console.log('eventName:', eventName);

  if (eventName !== 'INSERT' && eventName !== 'REMOVE') return;

  const image = eventName === 'INSERT'
    ? unmarshall(record.dynamodb?.NewImage as any)
    : unmarshall(record.dynamodb?.OldImage as any);

  const delta = eventName === 'INSERT' ? 1 : -1;
  console.log(`storyId=${image.storyId} delta=${delta}`);

  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: STORY_TABLE,
      Key: { id: { S: image.storyId } },
      UpdateExpression: 'ADD numComments :delta',
      // Without this, a comment on a story that no longer exists would create an empty stub Story row.
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeValues: { ':delta': { N: delta.toString() } },
    }));
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      console.log(`storyId=${image.storyId} no longer exists, skipping comment count`);
      return;
    }
    throw err;
  }
}