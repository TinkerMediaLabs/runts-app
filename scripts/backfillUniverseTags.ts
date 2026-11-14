// Gives every universe a tag of type 'universe' and links each story that has a universe to it.
// (The CMS now does this on every save; this fills in the stories saved before that.) Dry run by default.
//   npx tsx scripts/backfillUniverseTags.ts <table-suffix>            (dry run)
//   npx tsx scripts/backfillUniverseTags.ts <table-suffix> --apply
// Safe to re-run: tags are found by type + name + erotic flag, links are only added when missing.
import { randomUUID } from 'crypto';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
const apply = process.argv.includes('--apply');
if (!suffix || suffix.startsWith('--')) { console.error('Usage: npx tsx scripts/backfillUniverseTags.ts <table-suffix> [--apply]'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });
const T = (m: string) => `${m}-${suffix}-NONE`;

async function scanAll(table: string) {
  const out: any[] = []; let lastKey: any;
  do {
    const res: any = await client.send(new ScanCommand({ TableName: table, ExclusiveStartKey: lastKey }));
    out.push(...(res.Items ?? [])); lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return out;
}

async function main() {
  const now = new Date().toISOString();
  const universes = new Map<string, string>();                       // universe id -> name
  for (const u of await scanAll(T('Universe'))) if (u.id?.S && u.name?.S) universes.set(u.id.S, u.name.S);
  const idByKey = new Map<string, string>();                         // `${nameLower}|${erotic}` -> tag id
  for (const t of await scanAll(T('Tag'))) {
    if (t.tagType?.S === 'universe' && t.nameLower?.S && t.id?.S) idByKey.set(`${t.nameLower.S}|${t.isErotic?.BOOL ? 'E' : 'R'}`, t.id.S);
  }
  const links = await scanAll(T('StoryTag'));
  const have = new Set(links.map(l => `${l.storyId?.S}|${l.tagId?.S}`));

  let tagsMade = 0, linksMade = 0, skipped = 0;
  for (const s of await scanAll(T('Story'))) {
    const storyId = s.id?.S; const uname = universes.get(s.universeId?.S ?? '');
    if (!storyId) continue;
    if (!uname) { if (s.universeId?.S) { skipped++; console.log(`  skipped ${s.title?.S}: universe ${s.universeId.S} not found`); } continue; }
    const erotic = s.isErotic?.S === 'true' || s.isErotic?.BOOL === true;
    const key = `${uname.trim().toLowerCase()}|${erotic ? 'E' : 'R'}`;
    let tagId = idByKey.get(key);
    if (!tagId) {
      tagId = randomUUID(); idByKey.set(key, tagId); tagsMade++;
      console.log(`${apply ? 'create' : 'would create'} universe tag "${uname}"${erotic ? ' (erotic)' : ''}`);
      if (apply) await client.send(new PutItemCommand({ TableName: T('Tag'), Item: {
        __typename: { S: 'Tag' }, id: { S: tagId }, name: { S: uname.trim() }, nameLower: { S: uname.trim().toLowerCase() },
        searchPk: { S: erotic ? 'EROTIC' : 'REGULAR' }, primaryFlag: { S: 'false' }, isPrimary: { BOOL: false }, isErotic: { BOOL: erotic },
        color: { S: '#00ffff' }, tagType: { S: 'universe' }, createdAt: { S: now }, updatedAt: { S: now } } }));
    }
    if (!have.has(`${storyId}|${tagId}`)) {
      have.add(`${storyId}|${tagId}`); linksMade++;
      console.log(`  ${apply ? 'link' : 'would link'} ${s.title?.S ?? storyId} -> ${uname}`);
      if (apply) await client.send(new PutItemCommand({ TableName: T('StoryTag'), Item: {
        __typename: { S: 'StoryTag' }, id: { S: randomUUID() }, storyId: { S: storyId }, tagId: { S: tagId }, createdAt: { S: now }, updatedAt: { S: now } } }));
    }
  }
  console.log({ apply, universes: universes.size, tagsMade, linksMade, skipped });
  if (!apply) console.log('Dry run only. Add --apply to write.');
}
main().catch(e => { console.error(e); process.exit(1); });
