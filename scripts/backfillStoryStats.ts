// Recomputes the StoryStats GLOBAL row (live / draft / erotic) from the Story table (ground truth).
// Run after any table wipe / first deploy:  npx tsx scripts/backfillStoryStats.ts <table-suffix>
// Dev: ksza7azahbfobkmlxyzaoqnhf4-NONE style suffix WITHOUT "-NONE", e.g. ksza7azahbfobkmlxyzaoqnhf4
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
if (!suffix) { console.error('Usage: npx tsx scripts/backfillStoryStats.ts <table-suffix>'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });

async function main() {
  let live = 0, draft = 0, erotic = 0, lastKey: any;
  do {
    const res: any = await client.send(new ScanCommand({
      TableName: `Story-${suffix}-NONE`, ExclusiveStartKey: lastKey,
      ProjectionExpression: '#l, isErotic', ExpressionAttributeNames: { '#l': 'live' },
    }));
    for (const it of res.Items ?? []) {
      if (it.live?.S === 'true') live++;
      if (it.live?.S === 'false') draft++;
      if (it.isErotic?.S === 'true') erotic++;
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  const now = new Date().toISOString();
  await client.send(new PutItemCommand({
    TableName: `StoryStats-${suffix}-NONE`,
    Item: {
      id: { S: 'GLOBAL' }, live: { N: String(live) }, draft: { N: String(draft) }, erotic: { N: String(erotic) },
      createdAt: { S: now }, updatedAt: { S: now }, __typename: { S: 'StoryStats' },
    },
  }));
  console.log({ live, draft, erotic, total: live + draft });
}
main().catch(e => { console.error(e); process.exit(1); });
