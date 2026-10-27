import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { findDrift, buildReport, Fix, StoryRow, LinkRow } from './drift';

// Daily: checks that the derived data the app depends on is consistent, repairs small drift, and emails a
// report (through the alerts topic) only when something needed attention. Reads are full scans of two tables
// with a tiny projection, which is cheap once a day even at 100k+ stories.
const dynamo = new DynamoDBClient({});
const sns = new SNSClient({});
const STORY_TABLE = process.env.STORY_TABLE_NAME!;
const STORYTAG_TABLE = process.env.STORYTAG_TABLE_NAME!;
const TRENDING_TABLE = process.env.TRENDING_TABLE_NAME!;
const TOPIC_ARN = process.env.ALERT_TOPIC_ARN!;
const REPAIR_CAP = 500;
const MAX_SNAPSHOT_AGE_HOURS = 3;   // the snapshot job runs hourly

async function scanAll<T>(table: string, projection: string, names: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  let key: any;
  do {
    const res: any = await dynamo.send(new ScanCommand({
      TableName: table, ProjectionExpression: projection, ExclusiveStartKey: key,
      ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
    }));
    for (const it of res.Items ?? []) out.push(unmarshall(it) as T);
    key = res.LastEvaluatedKey;
  } while (key);
  return out;
}

async function applyFix(fix: Fix) {
  const table = fix.table === 'Story' ? STORY_TABLE : STORYTAG_TABLE;
  const sets: string[] = []; const removes: string[] = [];
  const names: Record<string, string> = {}; const values: Record<string, any> = {};
  const put = (i: number, attr: string, val: string | undefined) => {
    names[`#a${i}`] = attr;
    if (val === undefined) removes.push(`#a${i}`);
    else { values[`:v${i}`] = { S: val }; sets.push(`#a${i} = :v${i}`); }
  };
  put(0, 'liveTagId', fix.liveTagId);
  if (fix.table === 'StoryTag') put(1, 'publishedAt', fix.publishedAt);
  const expr = [sets.length ? `SET ${sets.join(', ')}` : '', removes.length ? `REMOVE ${removes.join(', ')}` : ''].filter(Boolean).join(' ');
  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: table, Key: { id: { S: fix.id } }, UpdateExpression: expr,
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeNames: names,
      ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
    }));
  } catch (e: any) {
    if (e?.name !== 'ConditionalCheckFailedException') throw e;   // deleted meanwhile
  }
}

// Age in hours of the newest TrendingSnapshot row, or null when the table is empty.
async function snapshotAgeHours(): Promise<number | null> {
  const rows = await scanAll<{ updatedAt?: string }>(TRENDING_TABLE, '#u', { '#u': 'updatedAt' });
  let newest = 0;
  for (const r of rows) { const t = r.updatedAt ? Date.parse(r.updatedAt) : 0; if (t > newest) newest = t; }
  return newest ? (Date.now() - newest) / 3_600_000 : null;
}

export const handler = async () => {
  const stories = await scanAll<StoryRow>(STORY_TABLE, 'id, #l, primaryTagId, liveTagId, publishedAt', { '#l': 'live' });
  const links = await scanAll<LinkRow>(STORYTAG_TABLE, 'id, storyId, tagId, liveTagId, publishedAt', {});
  const drift = findDrift(stories, links);

  const fixes = [...drift.storyFixes, ...drift.linkFixes].slice(0, REPAIR_CAP);
  for (const f of fixes) await applyFix(f);

  const age = await snapshotAgeHours();
  const report = buildReport({
    stories: stories.length, links: links.length, drift, repaired: fixes.length, repairCap: REPAIR_CAP,
    snapshotAgeHours: age, maxSnapshotAgeHours: MAX_SNAPSHOT_AGE_HOURS,
  });
  const text = report.lines.join('\n');
  console.warn('data-health:\n' + text);

  if (report.problem) {
    await sns.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Subject: 'Runts data health: needs attention',
      Message: text,
    }));
  }
  return { problem: report.problem, report: report.lines };
};
