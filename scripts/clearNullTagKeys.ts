// Removes attributes stored as an explicit NULL from Tag rows. Older CMS saves wrote tagType: null on genre tags;
// now that tagType is an index key, DynamoDB refuses every update to such a row (including the tag-count
// aggregator). A removed attribute means the same as a null one. Dry run by default.
//   npx tsx scripts/clearNullTagKeys.ts <table-suffix>            (dry run)
//   npx tsx scripts/clearNullTagKeys.ts <table-suffix> --apply
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
const apply = process.argv.includes('--apply');
if (!suffix || suffix.startsWith('--')) { console.error('Usage: npx tsx scripts/clearNullTagKeys.ts <table-suffix> [--apply]'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });
const TABLE = `Tag-${suffix}-NONE`;

async function main() {
  let lastKey: any; let rows = 0, fixed = 0;
  const perAttr: Record<string, number> = {};
  do {
    const res: any = await client.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey }));
    for (const item of res.Items ?? []) {
      rows++;
      const nulls = Object.entries(item).filter(([, v]: any) => v?.NULL === true).map(([k]) => k);
      if (!nulls.length || !item.id?.S) continue;
      fixed++; for (const k of nulls) perAttr[k] = (perAttr[k] ?? 0) + 1;
      if (apply) {
        const names: Record<string, string> = {}; nulls.forEach((k, i) => { names[`#n${i}`] = k; });
        await client.send(new UpdateItemCommand({
          TableName: TABLE, Key: { id: { S: item.id.S } },
          UpdateExpression: `REMOVE ${nulls.map((_, i) => `#n${i}`).join(', ')}`, ExpressionAttributeNames: names,
        }));
      }
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  console.log({ apply, rows, rowsWithNulls: fixed, nullAttributes: perAttr });
  if (!apply) console.log('Dry run only. Add --apply to write.');
}
main().catch(e => { console.error(e); process.exit(1); });
