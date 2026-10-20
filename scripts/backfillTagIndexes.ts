// Sets Story.liveTagId, StoryTag.liveTagId and StoryTag.publishedAt from the current data
// (ground truth). The tag-index-sync Lambda keeps them current afterwards; run this once per
// environment after the first deploy and after any table wipe/restore:
//   npx tsx scripts/backfillTagIndexes.ts <table-suffix>      (suffix WITHOUT "-NONE")
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
if (!suffix) { console.error('Usage: npx tsx scripts/backfillTagIndexes.ts <table-suffix>'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });

async function scanAll(table: string) {
  const out: any[] = []; let lastKey: any;
  do {
    const res: any = await client.send(new ScanCommand({ TableName: table, ExclusiveStartKey: lastKey }));
    out.push(...(res.Items ?? [])); lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return out;
}

async function setOrRemove(table: string, id: string, attrs: Record<string, string | undefined>) {
  const sets: string[] = []; const removes: string[] = [];
  const names: Record<string, string> = {}; const values: Record<string, any> = {};
  let n = 0;
  for (const [attr, val] of Object.entries(attrs)) {
    names[`#a${n}`] = attr;
    if (val === undefined) removes.push(`#a${n}`); else { values[`:v${n}`] = { S: val }; sets.push(`#a${n} = :v${n}`); }
    n++;
  }
  const expr = [sets.length ? `SET ${sets.join(', ')}` : '', removes.length ? `REMOVE ${removes.join(', ')}` : ''].filter(Boolean).join(' ');
  await client.send(new UpdateItemCommand({
    TableName: table, Key: { id: { S: id } }, UpdateExpression: expr,
    ExpressionAttributeNames: names, ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
  }));
}

async function main() {
  const stories = await scanAll(`Story-${suffix}-NONE`);
  const byId = new Map<string, any>();
  let storiesSet = 0;
  for (const s of stories) {
    const id = s.id?.S; if (!id) continue;
    byId.set(id, s);
    const live = s.live?.S === 'true';
    const want = live && s.primaryTagId?.S ? s.primaryTagId.S : undefined;
    if (s.liveTagId?.S !== want) { await setOrRemove(`Story-${suffix}-NONE`, id, { liveTagId: want }); storiesSet++; }
  }
  const links = await scanAll(`StoryTag-${suffix}-NONE`);
  let linksSet = 0, orphan = 0;
  for (const l of links) {
    const id = l.id?.S; if (!id) continue;
    const s = byId.get(l.storyId?.S ?? '');
    if (!s) { orphan++; continue; }
    const wantLive = s.live?.S === 'true' ? l.tagId?.S : undefined;
    const wantPub = s.publishedAt?.S;
    if (l.liveTagId?.S !== wantLive || l.publishedAt?.S !== wantPub) {
      await setOrRemove(`StoryTag-${suffix}-NONE`, id, { liveTagId: wantLive, publishedAt: wantPub });
      linksSet++;
    }
  }
  console.log({ stories: stories.length, storiesUpdated: storiesSet, storyTags: links.length, storyTagsUpdated: linksSet, orphanLinks: orphan });
}
main().catch(e => { console.error(e); process.exit(1); });
