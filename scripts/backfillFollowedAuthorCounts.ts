// Recomputes User.followedAuthorCount from the UserFollowedAuthor table (ground truth).
// Run after any table wipe / first deploy:  npx tsx scripts/backfillFollowedAuthorCounts.ts <table-suffix>
// <table-suffix> is the id WITHOUT "-NONE" (e.g. ksza7azahbfobkmlxyzaoqnhf4).
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
if (!suffix) { console.error('Usage: npx tsx scripts/backfillFollowedAuthorCounts.ts <table-suffix>'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });

async function scanAll(table: string, projection: string, names?: Record<string, string>) {
  const out: any[] = []; let lastKey: any;
  do {
    const res: any = await client.send(new ScanCommand({
      TableName: table, ExclusiveStartKey: lastKey, ProjectionExpression: projection, ExpressionAttributeNames: names,
    }));
    out.push(...(res.Items ?? [])); lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return out;
}

async function main() {
  const follows = await scanAll(`UserFollowedAuthor-${suffix}-NONE`, 'userId');
  const counts = new Map<string, number>();
  for (const f of follows) { const u = f.userId?.S; if (u) counts.set(u, (counts.get(u) ?? 0) + 1); }
  const users = await scanAll(`User-${suffix}-NONE`, 'id');
  let updated = 0;
  for (const u of users) {
    const id = u.id?.S; if (!id) continue;
    await client.send(new UpdateItemCommand({
      TableName: `User-${suffix}-NONE`, Key: { id: { S: id } },
      UpdateExpression: 'SET #c = :n', ExpressionAttributeNames: { '#c': 'followedAuthorCount' },
      ExpressionAttributeValues: { ':n': { N: String(counts.get(id) ?? 0) } },
    }));
    updated++;
  }
  console.log({ users: users.length, usersWithFollows: counts.size, totalFollows: follows.length, updated });
}
main().catch(e => { console.error(e); process.exit(1); });
