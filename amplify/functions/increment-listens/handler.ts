import { DynamoDBClient, UpdateItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamo = new DynamoDBClient({});

// One counted listen per user and story per window. Re-opening or restarting the same story inside
// the window does not count again, which also stops a script from inflating a story's count.
const DEDUPE_WINDOW_SECONDS = 60 * 60;

export const handler = async (event: any) => {
  const storyId = event.arguments?.storyId;
  const userId = event.identity?.sub ?? event.identity?.username;

  if (!storyId || !userId) {
    return false;
  }

  const bufferTable = process.env.LISTEN_BUFFER_TABLE_NAME;
  const dedupeTable = process.env.LISTEN_DEDUPE_TABLE_NAME;
  if (!bufferTable || !dedupeTable) {
    console.error('LISTEN_BUFFER_TABLE_NAME / LISTEN_DEDUPE_TABLE_NAME env var not set');
    return false;
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // Already counted for this user + story inside the window? Succeed quietly without counting.
    try {
      await dynamo.send(new PutItemCommand({
        TableName: dedupeTable,
        Item: {
          id:         { S: `${userId}#${storyId}` },
          expiresAt:  { N: String(now + DEDUPE_WINDOW_SECONDS) },
          __typename: { S: 'ListenDedupe' },
        },
        ConditionExpression: 'attribute_not_exists(id) OR expiresAt < :now',
        ExpressionAttributeValues: { ':now': { N: String(now) } },
      }));
    } catch (err: any) {
      if (err?.name === 'ConditionalCheckFailedException') return true;
      throw err;
    }

    // Plays go to a small buffer row, NOT the Story row. listens-aggregator folds the buffer into
    // Story.numListens in batches (see that function).
    await dynamo.send(new UpdateItemCommand({
      TableName: bufferTable,
      Key: { id: { S: storyId } },
      UpdateExpression: 'ADD #c :one SET #tn = if_not_exists(#tn, :tn)',
      ExpressionAttributeNames: { '#c': 'count', '#tn': '__typename' },
      ExpressionAttributeValues: { ':one': { N: '1' }, ':tn': { S: 'StoryListenBuffer' } },
    }));
    return true;
  } catch (err) {
    console.error('increment-listens error:', err);
    return false;
  }
};
