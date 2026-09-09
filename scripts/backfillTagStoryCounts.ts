// ---------------------------------------------------------------------------
// Tag Story-Count Backfill
//
// One-time script to populate Tag.storyCount for existing tags, since the
// tag-count-aggregator Lambda only handles StoryTag changes going forward —
// it has no knowledge of associations that already existed before it was
// deployed. Computes each tag's true count directly from StoryTag records
// (ground truth) and writes it explicitly, including 0 for tags with no
// stories, so every tag has a real number rather than an unset field.
//
// Run from project root: npx tsx scripts/backfillTagStoryCounts.ts <table-suffix>
// Example (dev):        npx tsx scripts/backfillTagStoryCounts.ts ksza7azahbfobkmlxyzaoqnhf4
// Example (staging):    npx tsx scripts/backfillTagStoryCounts.ts 5ojmsd7i5nbq5foh2wefkdhj3e
// Example (production): npx tsx scripts/backfillTagStoryCounts.ts nzvkuznrzjfc5kud3vfik5j7ey
// ---------------------------------------------------------------------------

import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const REGION = 'us-east-2';

const suffix = process.argv[2];
if (!suffix) {
  console.error('Usage: npx tsx scripts/backfillTagStoryCounts.ts <table-suffix>');
  process.exit(1);
}

const TAG_TABLE       = `Tag-${suffix}-NONE`;
const STORY_TAG_TABLE = `StoryTag-${suffix}-NONE`;

const client = new DynamoDBClient({ region: REGION });

async function scanAll(tableName: string): Promise<any[]> {
  const items: any[] = [];
  let lastKey: any = undefined;
  do {
    const res: any = await client.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function main() {
  console.log(`Target: ${suffix}`);
  console.log(`Scanning ${STORY_TAG_TABLE}...`);
  const storyTags = await scanAll(STORY_TAG_TABLE);
  console.log(`Found ${storyTags.length} StoryTag records`);

  const counts: Record<string, number> = {};
  for (const item of storyTags) {
    const tagId = item.tagId?.S;
    if (!tagId) continue;
    counts[tagId] = (counts[tagId] ?? 0) + 1;
  }

  console.log(`Scanning ${TAG_TABLE}...`);
  const tags = await scanAll(TAG_TABLE);
  console.log(`Found ${tags.length} Tag records`);
  console.log('');

  for (const tag of tags) {
    const id = tag.id?.S;
    if (!id) continue;
    const count = counts[id] ?? 0;
    await client.send(new UpdateItemCommand({
      TableName: TAG_TABLE,
      Key: { id: { S: id } },
      UpdateExpression: 'SET storyCount = :count',
      ExpressionAttributeValues: { ':count': { N: String(count) } },
    }));
    console.log(`  ${(tag.name?.S ?? id).padEnd(24)} storyCount = ${count}`);
  }

  console.log('');
  console.log('Backfill complete.');
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
