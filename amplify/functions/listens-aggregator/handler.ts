import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Folds the per-play buffer (StoryListenBuffer, one row per story, written by increment-listens)
// into Story.numListens. The stream is read in large batches over a ~60s window, so a story that
// is played 500 times in that window gets ONE Story-row write instead of 500. That keeps the
// Story table, its numListens indexes and its stream quiet no matter how many plays happen.
const dynamo = new DynamoDBClient({});
const STORY_TABLE = process.env.STORY_TABLE_NAME!;
const DAY_TABLE = process.env.DAY_TABLE_NAME!;
const CONCURRENCY = 10;

export const handler = async (event: DynamoDBStreamEvent) => {
  const deltas = new Map<string, number>();
  for (const record of event.Records) {
    if (record.eventName === 'REMOVE' || !record.dynamodb?.NewImage) continue;
    const n: any = unmarshall(record.dynamodb.NewImage as any);
    const o: any = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage as any) : null;
    const delta = (n.count ?? 0) - (o?.count ?? 0);
    if (n.id && delta > 0) deltas.set(n.id, (deltas.get(n.id) ?? 0) + delta);
  }

  const entries = Array.from(deltas.entries());
  const day = new Date().toISOString().slice(0, 10);
  let failed = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(entries.slice(i, i + CONCURRENCY).map(async ([storyId, delta]) => {
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: STORY_TABLE,
          Key: { id: { S: storyId } },
          UpdateExpression: 'ADD numListens :d',
          ConditionExpression: 'attribute_exists(id)',
          ExpressionAttributeValues: { ':d': { N: String(delta) } },
        }));
        // Per-day count for Trending. A failure here must not fail the batch (a retry would count the
        // Story row twice), so Trending just runs a little low for that story.
        try {
          await dynamo.send(new UpdateItemCommand({
            TableName: DAY_TABLE,
            Key: { id: { S: `${day}#${storyId}` } },
            UpdateExpression: 'ADD #c :d SET #day = :day, storyId = :s, #tn = if_not_exists(#tn, :tn)',
            ExpressionAttributeNames: { '#c': 'count', '#day': 'day', '#tn': '__typename' },
            ExpressionAttributeValues: {
              ':d': { N: String(delta) }, ':day': { S: day }, ':s': { S: storyId }, ':tn': { S: 'StoryListenDay' },
            },
          }));
        } catch (dayErr) {
          console.error('listens-aggregator day count failed for', storyId, dayErr);
        }
      } catch (err: any) {
        if (err?.name === 'ConditionalCheckFailedException') return; // story no longer exists
        failed++;
        console.error('listens-aggregator update failed for', storyId, err);
      }
    }));
  }
  console.log(`listens-aggregator: ${entries.length} stor${entries.length === 1 ? 'y' : 'ies'} updated, ${failed} failed`);
  if (failed > 0) throw new Error(`${failed} story listen update(s) failed`);
};
