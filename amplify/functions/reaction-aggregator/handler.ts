import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamo = new DynamoDBClient({});
const REACTION_COUNT_TABLE = process.env.REACTION_COUNT_TABLE_NAME!;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: DynamoDBRecord) {
  const eventName = record.eventName;

  if (eventName === 'INSERT') {
    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    await adjustCount(newImage.storyId, newImage.reaction, 1);

  } else if (eventName === 'MODIFY') {
    const oldImage = unmarshall(record.dynamodb?.OldImage as any);
    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    if (oldImage.reaction !== newImage.reaction) {
      await adjustCount(newImage.storyId, oldImage.reaction, -1);
      await adjustCount(newImage.storyId, newImage.reaction, 1);
    }

  } else if (eventName === 'REMOVE') {
    const oldImage = unmarshall(record.dynamodb?.OldImage as any);
    await adjustCount(oldImage.storyId, oldImage.reaction, -1);
  }
}

async function adjustCount(storyId: string, reactionType: string, delta: number) {
  await dynamo.send(new UpdateItemCommand({
    TableName: REACTION_COUNT_TABLE,
    Key: {
      storyId:      { S: storyId },
      reactionType: { S: reactionType },
    },
    UpdateExpression: 'ADD #count :delta',
    ExpressionAttributeNames:  { '#count': 'count' },
    ExpressionAttributeValues: { ':delta': { N: delta.toString() } },
  }));
}