import { DynamoDBClient, UpdateItemCommand, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const dynamo = new DynamoDBClient({});
const REACTION_COUNT_TABLE = process.env.REACTION_COUNT_TABLE_NAME!;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      console.error('processRecord error:', JSON.stringify(err));
    }
  }
};

async function processRecord(record: DynamoDBRecord) {
  const eventName = record.eventName;
  console.log('eventName:', eventName);

  if (eventName === 'INSERT') {
    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    console.log('INSERT newImage:', JSON.stringify(newImage));
    await adjustCount(newImage.storyId, newImage.reaction, 1);

  } else if (eventName === 'MODIFY') {
    const oldImage = unmarshall(record.dynamodb?.OldImage as any);
    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    console.log('MODIFY old reaction:', oldImage.reaction, 'new reaction:', newImage.reaction);
    if (oldImage.reaction !== newImage.reaction) {
      await adjustCount(newImage.storyId, oldImage.reaction, -1);
      await adjustCount(newImage.storyId, newImage.reaction, 1);
    }

  } else if (eventName === 'REMOVE') {
    const oldImage = unmarshall(record.dynamodb?.OldImage as any);
    console.log('REMOVE oldImage:', JSON.stringify(oldImage));
    await adjustCount(oldImage.storyId, oldImage.reaction, -1);
  }
}

async function findReactionCount(storyId: string, reactionType: string) {
  console.log('findReactionCount:', storyId, reactionType);
  const { Items } = await dynamo.send(new ScanCommand({
    TableName: REACTION_COUNT_TABLE,
    FilterExpression: 'storyId = :sid AND reactionType = :rt',
    ExpressionAttributeValues: {
      ':sid': { S: storyId },
      ':rt':  { S: reactionType },
    },
  }));
  console.log('findReactionCount results:', Items?.length ?? 0);
  return Items && Items.length > 0 ? unmarshall(Items[0]) : null;
}

async function adjustCount(storyId: string, reactionType: string, delta: number) {
  console.log(`adjustCount storyId=${storyId} reactionType=${reactionType} delta=${delta}`);
  const existing = await findReactionCount(storyId, reactionType);

  if (existing) {
    console.log('Updating existing record id:', existing.id, 'count:', existing.count);
    await dynamo.send(new UpdateItemCommand({
      TableName: REACTION_COUNT_TABLE,
      Key: { id: { S: existing.id } },
      UpdateExpression: 'ADD #cnt :delta',
      ExpressionAttributeNames:  { '#cnt': 'count' },
      ExpressionAttributeValues: { ':delta': { N: delta.toString() } },
    }));
  } else if (delta > 0) {
    const newId = randomUUID();
    console.log('Creating new reaction count record id:', newId);
    await dynamo.send(new PutItemCommand({
      TableName: REACTION_COUNT_TABLE,
      Item: {
        id:           { S: newId },
        storyId:      { S: storyId },
        reactionType: { S: reactionType },
        count:        { N: '1' },
        createdAt:    { S: new Date().toISOString() },
        updatedAt:    { S: new Date().toISOString() },
        __typename:   { S: 'StoryReactionCount' },
      },
    }));
  } else {
    console.log('No existing record and delta <= 0, skipping');
  }
}