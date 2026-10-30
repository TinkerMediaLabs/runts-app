import { randomUUID } from 'node:crypto';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { COMMENT_RATE_LIMIT_MESSAGE } from './commentFilter';
import { cleanContent, cleanId, displayName, isRateLimited, RATE_LIMIT_COUNT, CommentError } from './core';

// postComment / editComment. The author always comes from the sign-in (never from the request), so a
// modified app cannot post as someone else, skip the word filter or the length limit, or flood a story.
const db = new DynamoDBClient({});
const COMMENT_TABLE = process.env.COMMENT_TABLE_NAME!;
const STORY_TABLE = process.env.STORY_TABLE_NAME!;
const USER_TABLE = process.env.USER_TABLE_NAME!;

const shape = (c: { id: string; content: string; userName: string; createdAt: string }) => c;

export const handler = async (event: any) => {
  const sub: string | undefined = event.identity?.sub;
  const username: string | undefined = event.identity?.username;
  if (!sub || !username) throw new Error('Not authorized');

  const field = event.info?.fieldName ?? event.fieldName;
  const args = event.arguments ?? {};

  try {
    if (field === 'postComment') return await postComment(sub, username, args);
    if (field === 'editComment') return await editComment(sub, args);
    throw new Error('Unknown request');
  } catch (err) {
    if (err instanceof CommentError) throw new Error(err.message);
    throw err;
  }
};

async function postComment(sub: string, username: string, args: any) {
  const storyId = cleanId(args.storyId);
  const content = cleanContent(args.content);

  // A comment on a story that does not exist would make the comment counter create an empty story row.
  const story = await db.send(new GetItemCommand({ TableName: STORY_TABLE, Key: { id: { S: storyId } }, ProjectionExpression: 'id' }));
  if (!story.Item) throw new CommentError('That story could not be found.');

  const recent = await db.send(new QueryCommand({
    TableName: COMMENT_TABLE,
    IndexName: 'byUserAndCreatedAt',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': { S: sub } },
    ScanIndexForward: false,
    Limit: RATE_LIMIT_COUNT,
    ProjectionExpression: 'createdAt',
  }));
  const times = (recent.Items ?? []).map(i => i.createdAt?.S ?? '').filter(Boolean);
  if (isRateLimited(times, Date.now())) throw new CommentError(COMMENT_RATE_LIMIT_MESSAGE);

  let profileName: string | undefined;
  if (!args.anonymous) {
    const user = await db.send(new GetItemCommand({ TableName: USER_TABLE, Key: { id: { S: sub } }, ProjectionExpression: '#n', ExpressionAttributeNames: { '#n': 'name' } }));
    profileName = user.Item?.name?.S;
  }
  const userName = displayName(!!args.anonymous, profileName);

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.send(new PutItemCommand({
    TableName: COMMENT_TABLE,
    Item: {
      id: { S: id },
      __typename: { S: 'Comment' },
      owner: { S: `${sub}::${username}` },   // same value the data layer stores, so the author can still read and delete it
      userId: { S: sub },
      storyId: { S: storyId },
      content: { S: content },
      userName: { S: userName },
      createdAt: { S: now },
      updatedAt: { S: now },
    },
  }));
  return shape({ id, content, userName, createdAt: now });
}

async function editComment(sub: string, args: any) {
  const id = cleanId(args.id);
  const content = cleanContent(args.content);
  const now = new Date().toISOString();
  try {
    const res = await db.send(new UpdateItemCommand({
      TableName: COMMENT_TABLE,
      Key: { id: { S: id } },
      UpdateExpression: 'SET content = :c, updatedAt = :t',
      ConditionExpression: 'attribute_exists(id) AND userId = :u',
      ExpressionAttributeValues: { ':c': { S: content }, ':t': { S: now }, ':u': { S: sub } },
      ReturnValues: 'ALL_NEW',
    }));
    const a = res.Attributes ?? {};
    return shape({ id, content, userName: a.userName?.S ?? 'Anonymous', createdAt: a.createdAt?.S ?? now });
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') throw new CommentError('That comment could not be found.');
    throw err;
  }
}
