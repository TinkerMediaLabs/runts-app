import { DynamoDBClient, UpdateItemCommand, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamo = new DynamoDBClient({});
const TAG_TABLE = process.env.TAG_TABLE_NAME!;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      console.error('tag-count-aggregator error:', JSON.stringify(err));
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

  const tagId = image.tagId;
  if (!tagId) return;

  if (eventName === 'INSERT') {
    console.log(`tagId=${tagId} delta=+1`);
    await dynamo.send(new UpdateItemCommand({
      TableName: TAG_TABLE,
      Key: { id: { S: tagId } },
      UpdateExpression: 'ADD storyCount :delta',
      ExpressionAttributeValues: { ':delta': { N: '1' } },
    }));
    return;
  }

  // REMOVE — decrement, but never go below 0
  console.log(`tagId=${tagId} delta=-1 (floor-guarded)`);
  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: TAG_TABLE,
      Key: { id: { S: tagId } },
      UpdateExpression: 'ADD storyCount :delta',
      ConditionExpression: 'storyCount > :zero',
      ExpressionAttributeValues: {
        ':delta': { N: '-1' },
        ':zero':  { N: '0' },
      },
    }));
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      console.log(`tagId=${tagId} already at 0, skipping decrement`);
      return;
    }
    throw err;
  }
}
