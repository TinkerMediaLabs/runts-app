// Creates the four starting length options for the taste picker. Dry run by default.
//   npx tsx scripts/seedPickerOptions.ts <table-suffix>            (dry run)
//   npx tsx scripts/seedPickerOptions.ts <table-suffix> --apply
// A band is 15 minutes (Story duration / 900, floored). Safe to re-run: options are found by kind + key, so
// edits made in the CMS are never overwritten. The last option has no upper band, so it takes every story over
// an hour, however the longest story grows.
import { randomUUID } from 'crypto';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
const apply = process.argv.includes('--apply');
if (!suffix || suffix.startsWith('--')) { console.error('Usage: npx tsx scripts/seedPickerOptions.ts <table-suffix> [--apply]'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });
const TABLE = `PickerOption-${suffix}-NONE`;

const LENGTHS = [
  { key: 'short',  label: 'Short and sweet',  subtitle: 'Under 15 minutes', minBand: 0, maxBand: 0 },
  { key: 'medium', label: 'Medium',           subtitle: '15 to 30 minutes', minBand: 1, maxBand: 1 },
  { key: 'longer', label: 'A little longer',  subtitle: '30 to 60 minutes', minBand: 2, maxBand: 3 },
  { key: 'xlong',  label: 'Extra-long',       subtitle: '60 to 90 minutes', minBand: 4, maxBand: null as number | null },
];

async function main() {
  const have = new Set<string>(); let lastKey: any;
  do {
    const res: any = await client.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey }));
    for (const i of res.Items ?? []) if (i.kind?.S && i.key?.S) have.add(`${i.kind.S}:${i.key.S}`);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  const now = new Date().toISOString(); let made = 0;
  for (const [i, o] of LENGTHS.entries()) {
    if (have.has(`length:${o.key}`)) { console.log(`exists: ${o.label}`); continue; }
    console.log(`${apply ? 'create' : 'would create'} length option "${o.label}" (${o.subtitle})`); made++;
    if (apply) await client.send(new PutItemCommand({ TableName: TABLE, Item: {
      __typename: { S: 'PickerOption' }, id: { S: randomUUID() }, kind: { S: 'length' }, key: { S: o.key },
      label: { S: o.label }, subtitle: { S: o.subtitle }, minBand: { N: String(o.minBand) }, ...(o.maxBand == null ? {} : { maxBand: { N: String(o.maxBand) } }),
      sortOrder: { N: String(i + 1) }, enabled: { BOOL: true }, createdAt: { S: now }, updatedAt: { S: now } } }));
  }
  console.log({ apply, created: made });
  if (!apply) console.log('Dry run only. Add --apply to write.');
}
main().catch(e => { console.error(e); process.exit(1); });
