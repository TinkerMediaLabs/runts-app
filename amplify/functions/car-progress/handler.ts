import { randomUUID } from 'node:crypto';
import { DynamoDBClient, QueryCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { handleProgress } from './core';

const db = new DynamoDBClient({});
const T = {
  inProgress: process.env.IN_PROGRESS_TABLE_NAME!,
  pinned: process.env.PINNED_TABLE_NAME!,
  finished: process.env.FINISHED_TABLE_NAME!,
  story: process.env.STORY_TABLE_NAME!,
  user: process.env.USER_TABLE_NAME!,
};
const INDEX = 'byUserAndStory';

const rowsFor = async (table: string, userId: string, storyId: string) =>
  (await db.send(new QueryCommand({
    TableName: table,
    IndexName: INDEX,
    KeyConditionExpression: 'userId = :u AND storyId = :s',
    ExpressionAttributeValues: { ':u': { S: userId }, ':s': { S: storyId } },
    Limit: 10,
  }))).Items ?? [];

const deleteRows = async (table: string, rows: any[]) => {
  for (const r of rows) await db.send(new DeleteItemCommand({ TableName: table, Key: { id: r.id } }));
};

const base = (typename: string, owner: string, now: string) => ({
  id: { S: randomUUID() }, __typename: { S: typename }, owner: { S: owner },
  createdAt: { S: now }, updatedAt: { S: now },
});

export const handler = async (event: any) => {
  const out = await handleProgress(
    {
      authorization: event.headers?.authorization,
      body: event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body,
    },
    {
      secret: process.env.CAR_PASS_SECRET ?? '',
      now: () => Date.now(),

      saveProgress: async ({ userId, owner, storyId, position }) => {
        const now = new Date().toISOString();
        const existing = await rowsFor(T.inProgress, userId, storyId);
        if (existing.length) {
          await db.send(new UpdateItemCommand({
            TableName: T.inProgress,
            Key: { id: existing[0].id },
            UpdateExpression: 'SET progressSeconds = :p, lastListenedAt = :t, updatedAt = :t',
            ExpressionAttributeValues: { ':p': { N: String(position) }, ':t': { S: now } },
          }));
        } else {
          await db.send(new PutItemCommand({
            TableName: T.inProgress,
            Item: {
              ...base('UserInProgressStory', owner, now),
              userId: { S: userId }, storyId: { S: storyId },
              progressSeconds: { N: String(position) }, lastListenedAt: { S: now },
            },
          }));
        }
      },

      finish: async ({ userId, owner, storyId }) => {
        const now = new Date().toISOString();
        const already = await rowsFor(T.finished, userId, storyId);
        if (!already.length) {
          await db.send(new PutItemCommand({
            TableName: T.finished,
            Item: { ...base('UserFinishedStory', owner, now), userId: { S: userId }, storyId: { S: storyId }, finishedAt: { S: now } },
          }));
          try {
            const story = (await db.send(new GetItemCommand({ TableName: T.story, Key: { id: { S: storyId } } }))).Item;
            await db.send(new UpdateItemCommand({
              TableName: T.user,
              Key: { id: { S: userId } },
              ConditionExpression: 'attribute_exists(id)',
              UpdateExpression: 'ADD totalStoriesFinished :one, totalListenSeconds :d',
              ExpressionAttributeValues: { ':one': { N: '1' }, ':d': { N: story?.duration?.N ?? '0' } },
            }));
          } catch (e) {
            console.warn('car-progress: could not update listening totals', e);
          }
        }
        await deleteRows(T.pinned, await rowsFor(T.pinned, userId, storyId));
        await deleteRows(T.inProgress, await rowsFor(T.inProgress, userId, storyId));
      },
    },
  );
  return { statusCode: out.status };
};
