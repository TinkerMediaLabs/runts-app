import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { computeInsights, TagLink } from './insights';

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

  const tags = await scanAll({ TableName: TAG_TABLE, ProjectionExpression: 'id, isErotic' });
  const erotic = new Set<string>(tags.filter(t => t.isErotic).map(t => t.id));
  const insights = computeInsights(links, erotic);

  const now = new Date().toISOString();
  const ids = tags.map(t => t.id as string);
  let written = 0;
  for (let i = 0; i < ids.length; i += 25) {
    await Promise.all(ids.slice(i, i + 25).map(async id => {
      const r = insights.get(id) ?? { liveCount: 0, related: [], shared: {} };
      await dynamo.send(new UpdateItemCommand({
        TableName: INSIGHT_TABLE,
        Key: { id: { S: id } },
        UpdateExpression:
          'SET liveCount = :lc, relatedTagIds = :rt, relatedCounts = :rc, sharedJson = :sj, computedAt = :now, ' +
          '#tn = if_not_exists(#tn, :tn), createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
        ExpressionAttributeNames: { '#tn': '__typename' },
        ExpressionAttributeValues: {
          ':lc': { N: String(r.liveCount) },
          ':rt': { L: r.related.map(x => ({ S: x.tagId })) },
          ':rc': { L: r.related.map(x => ({ N: String(x.count) })) },
          ':sj': { S: JSON.stringify(r.shared) },
          ':now': { S: now },
          ':tn': { S: 'TagInsight' },
        },
      }));
      written++;
    }));
  }
  console.log(`tag-insights: ${links.length} live links, ${tags.length} tags, ${written} rows written`);
};
