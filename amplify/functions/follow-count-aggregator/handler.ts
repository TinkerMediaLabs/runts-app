import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Maintains User.followedAuthorCount from the UserFollowedAuthor stream so the profile screen
// reads ONE field instead of paging through every follow. INSERT = +1, REMOVE = -1.
// Batch deltas are summed per user. Decrements are floor-guarded (never below 0). Users that do
// not exist are skipped (no placeholder rows); backfillFollowedAuthorCounts.ts corrects drift.
const dynamo = new DynamoDBClient({});
const USER_TABLE = process.env.USER_TABLE_NAME!;

const isConditionFailure = (e: any) => e?.name === 'ConditionalCheckFailedException';

export const handler = async (event: DynamoDBStreamEvent) => {
  const deltas = new Map<string, number>();
  for (const record of event.Records) {
    const type = record.eventName;
    if (type !== 'INSERT' && type !== 'REMOVE') continue;
    const img = type === 'INSERT' ? record.dynamodb?.NewImage : record.dynamodb?.OldImage;
    if (!img) continue;
    const userId = (unmarshall(img as any) as any).userId;
    if (!userId) continue;
    deltas.set(userId, (deltas.get(userId) ?? 0) + (type === 'INSERT' ? 1 : -1));
  }

  for (const [userId, delta] of deltas) {
    if (delta === 0) continue;
    const key = { id: { S: userId } };
    const names = { '#c': 'followedAuthorCount' };
    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: USER_TABLE,
        Key: key,
        UpdateExpression: 'ADD #c :d',
        ConditionExpression: delta < 0
          ? 'attribute_exists(id) AND #c >= :min'
          : 'attribute_exists(id)',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: delta < 0
          ? { ':d': { N: String(delta) }, ':min': { N: String(-delta) } }
          : { ':d': { N: String(delta) } },
      }));
    } catch (e: any) {
      if (!isConditionFailure(e)) throw e;
      if (delta < 0) {
        // Would go below zero (or attribute missing): clamp to 0 if the user exists.
        try {
          await dynamo.send(new UpdateItemCommand({
            TableName: USER_TABLE, Key: key,
            UpdateExpression: 'SET #c = :z',
            ConditionExpression: 'attribute_exists(id)',
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: { ':z': { N: '0' } },
          }));
        } catch (e2: any) { if (!isConditionFailure(e2)) throw e2; }
      }
    }
  }
  console.log('follow count deltas', JSON.stringify(Object.fromEntries(deltas)));
};
