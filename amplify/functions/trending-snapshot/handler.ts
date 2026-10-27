import { DynamoDBClient, QueryCommand, PutItemCommand, UpdateItemCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { rankWindow, rankByTag, tagTotals, tagsToZero, lastDays, MIN_WINDOW, MAX_WINDOW, DayCounts } from './rank';

// Hourly: turns the per-day play counts (StoryListenDay) into one small TrendingSnapshot row per window
// (d2 ... d7) holding the top stories. Reads one day at a time through the byDay index, so the work grows
// with plays per day, never with the size of the catalog, and the app only ever reads a single row.
const dynamo = new DynamoDBClient({});
const DAY_TABLE = process.env.DAY_TABLE_NAME!;
const SNAPSHOT_TABLE = process.env.SNAPSHOT_TABLE_NAME!;
const INSIGHT_TABLE = process.env.TAG_INSIGHT_TABLE_NAME!;
const KEEP_DAYS = 10;   // rows older than this are deleted

type DayRow = { id: string; storyId: string; count: number; primaryTagId?: string; secondaryTagId?: string };

async function queryDay(day: string): Promise<DayRow[]> {
  const rows: any[] = [];
  let key: any;
  do {
    const res = await dynamo.send(new QueryCommand({
      TableName: DAY_TABLE,
      IndexName: 'byDay',
      KeyConditionExpression: '#d = :d',
      ExpressionAttributeNames: { '#d': 'day' },
      ExpressionAttributeValues: { ':d': { S: day } },
      ExclusiveStartKey: key,
    }));
    for (const it of res.Items ?? []) rows.push(unmarshall(it));
    key = res.LastEvaluatedKey;
  } while (key);
  return rows;
}

async function deleteRows(ids: string[]) {
  for (let i = 0; i < ids.length; i += 25) {
    await dynamo.send(new BatchWriteItemCommand({
      RequestItems: {
        [DAY_TABLE]: ids.slice(i, i + 25).map(id => ({ DeleteRequest: { Key: { id: { S: id } } } })),
      },
    }));
  }
}

export const handler = async () => {
  const now = Date.now();
  const days = lastDays(MAX_WINDOW, now);
  const perDay: DayCounts[] = [];
  const tagsOf = new Map<string, string[]>();   // story -> its primary / secondary genre (stored on the day rows)
  for (const day of days) {
    const m: DayCounts = new Map();
    for (const r of await queryDay(day)) {
      m.set(r.storyId, (m.get(r.storyId) ?? 0) + (r.count ?? 0));
      const tags = [r.primaryTagId, r.secondaryTagId].filter(Boolean) as string[];
      if (tags.length) tagsOf.set(r.storyId, tags);
    }
    perDay.push(m);
  }

  const stamp = new Date(now).toISOString();
  for (let w = MIN_WINDOW; w <= MAX_WINDOW; w++) {
    const top = rankWindow(perDay, w);
    await dynamo.send(new PutItemCommand({
      TableName: SNAPSHOT_TABLE,
      Item: {
        id:         { S: `d${w}` },
        __typename: { S: 'TrendingSnapshot' },
        windowDays: { N: String(w) },
        storyIds:   { L: top.map(t => ({ S: t.storyId })) },
        counts:     { L: top.map(t => ({ N: String(t.count) })) },
        computedAt: { S: stamp },
        createdAt:  { S: stamp },
        updatedAt:  { S: stamp },
      },
    }));
  }

  // Trending inside each genre (last 7 days). The app ignores a tag's list once it is older than two days,
  // so a genre that goes quiet simply stops showing it.
  const perTag = Array.from(rankByTag(perDay, tagsOf, MAX_WINDOW));
  for (let i = 0; i < perTag.length; i += 25) {
    await Promise.all(perTag.slice(i, i + 25).map(([tagId, top]) => dynamo.send(new UpdateItemCommand({
      TableName: INSIGHT_TABLE,
      Key: { id: { S: tagId } },
      UpdateExpression:
        'SET trendingStoryIds = :s, trendingCounts = :c, trendingAt = :now, ' +
        '#tn = if_not_exists(#tn, :tn), createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
      ExpressionAttributeNames: { '#tn': '__typename' },
      ExpressionAttributeValues: {
        ':s': { L: top.map(t => ({ S: t.storyId })) },
        ':c': { L: top.map(t => ({ N: String(t.count) })) },
        ':now': { S: stamp },
        ':tn': { S: 'TagInsight' },
      },
    }))));
  }

  // Plays per genre over the same 7 days, for the Discover "Popular right now" row. Genres that had plays last
  // time but none now are reset to 0 (found through the sparse byListListens index, so it only touches genres that
  // ever had plays).
  const totals = tagTotals(perDay, tagsOf, MAX_WINDOW);
  const previous: string[] = [];
  let lastKey: any;
  do {
    const res: any = await dynamo.send(new QueryCommand({
      TableName: INSIGHT_TABLE, IndexName: 'byListListens',
      KeyConditionExpression: 'listFlag = :f AND listens7 > :z',
      ExpressionAttributeValues: { ':f': { S: 'REGULAR' }, ':z': { N: '0' } },
      ProjectionExpression: 'id', ExclusiveStartKey: lastKey,
    }));
    for (const it of res.Items ?? []) previous.push(it.id.S);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  const listenUpdates: [string, number][] = [
    ...Array.from(totals),
    ...tagsToZero(previous, totals).map(id => [id, 0] as [string, number]),
  ];
  for (let i = 0; i < listenUpdates.length; i += 25) {
    await Promise.all(listenUpdates.slice(i, i + 25).map(([tagId, n]) => dynamo.send(new UpdateItemCommand({
      TableName: INSIGHT_TABLE,
      Key: { id: { S: tagId } },
      UpdateExpression:
        'SET listens7 = :n, listens7At = :now, ' +
        '#tn = if_not_exists(#tn, :tn), createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
      ExpressionAttributeNames: { '#tn': '__typename' },
      ExpressionAttributeValues: { ':n': { N: String(n) }, ':now': { S: stamp }, ':tn': { S: 'TagInsight' } },
    }))));
  }

  // Housekeeping: drop day rows older than KEEP_DAYS (a few past the 7-day window, in case a run was missed).
  let removed = 0;
  for (const day of lastDays(KEEP_DAYS + 5, now).slice(KEEP_DAYS)) {
    const old = await queryDay(day);
    if (old.length) { await deleteRows(old.map(r => r.id)); removed += old.length; }
  }
  console.log(`trending-snapshot: windows ${MIN_WINDOW}-${MAX_WINDOW} written, ${perTag.length} tag lists, ${removed} old day rows removed`);
};
