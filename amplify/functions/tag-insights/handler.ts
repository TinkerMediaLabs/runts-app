import { DynamoDBClient, ScanCommand, UpdateItemCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { computeInsights, discoverFields, staleInsightIds, TagLink } from './insights';

// Every few hours: reads every LIVE tag link once (the sparse byLiveTagAndPublishedAt index only holds links of
// live stories) and writes one TagInsight row per tag: how many live stories it has, its related genres and
// the newest stories shared with the top ones. Cost is one pass over the live links (cents at 100k stories);
// the app only ever reads a single row.
const dynamo = new DynamoDBClient({});
const STORYTAG_TABLE = process.env.STORYTAG_TABLE_NAME!;
const TAG_TABLE = process.env.TAG_TABLE_NAME!;
const INSIGHT_TABLE = process.env.TAG_INSIGHT_TABLE_NAME!;

async function scanAll(params: any): Promise<any[]> {
  const rows: any[] = [];
  let key: any;
  do {
    const res = await dynamo.send(new ScanCommand({ ...params, ExclusiveStartKey: key }));
    for (const it of res.Items ?? []) rows.push(unmarshall(it));
    key = res.LastEvaluatedKey;
  } while (key);
  return rows;
}

export const handler = async () => {
  const links = (await scanAll({
    TableName: STORYTAG_TABLE,
    IndexName: 'byLiveTagAndPublishedAt',
    ProjectionExpression: 'storyId, tagId, publishedAt',
  })) as TagLink[];

  const tags = await scanAll({ TableName: TAG_TABLE, ProjectionExpression: 'id, #n, isPrimary, isErotic', ExpressionAttributeNames: { '#n': 'name' } });
  const erotic = new Set<string>(tags.filter(t => t.isErotic).map(t => t.id));
  const insights = computeInsights(links, erotic);

  const now = new Date().toISOString();
  const ids = tags.map(t => t.id as string);
  const tagById = new Map<string, any>(tags.map(t => [t.id as string, t]));
  let written = 0;
  for (let i = 0; i < ids.length; i += 25) {
    await Promise.all(ids.slice(i, i + 25).map(async id => {
      const r = insights.get(id) ?? { liveCount: 0, related: [], shared: {} };
      const d = discoverFields(tagById.get(id), r.liveCount);
      await dynamo.send(new UpdateItemCommand({
        TableName: INSIGHT_TABLE,
        Key: { id: { S: id } },
        UpdateExpression:
          'SET liveCount = :lc, relatedTagIds = :rt, relatedCounts = :rc, sharedJson = :sj, computedAt = :now, ' +
          '#nm = :nm, nameLower = :nl, listens7 = if_not_exists(listens7, :zero), ' +
          (d.listed ? 'listFlag = :lf, ' : '') +
          '#tn = if_not_exists(#tn, :tn), createdAt = if_not_exists(createdAt, :now), updatedAt = :now' +
          (d.listed ? '' : ' REMOVE listFlag'),
        ExpressionAttributeNames: { '#tn': '__typename', '#nm': 'name' },
        ExpressionAttributeValues: {
          ':lc': { N: String(r.liveCount) },
          ':rt': { L: r.related.map(x => ({ S: x.tagId })) },
          ':rc': { L: r.related.map(x => ({ N: String(x.count) })) },
          ':sj': { S: JSON.stringify(r.shared) },
          ':now': { S: now },
          ':tn': { S: 'TagInsight' },
          ':nm': { S: d.name || ' ' },
          ':nl': { S: d.nameLower || ' ' },
          ':zero': { N: '0' },
          ...(d.listed ? { ':lf': { S: 'REGULAR' } } : {}),
        },
      }));
      written++;
    }));
  }

  // Rows of genres that were deleted in the CMS.
  const existing = (await scanAll({ TableName: INSIGHT_TABLE, ProjectionExpression: 'id' })).map(r => r.id as string);
  const stale = staleInsightIds(existing, new Set(ids));
  for (let i = 0; i < stale.length; i += 25) {
    await dynamo.send(new BatchWriteItemCommand({
      RequestItems: { [INSIGHT_TABLE]: stale.slice(i, i + 25).map(id => ({ DeleteRequest: { Key: { id: { S: id } } } })) },
    }));
  }
  console.log(`tag-insights: ${links.length} live links, ${tags.length} tags, ${written} rows written, ${stale.length} stale rows removed`);
};
