// Creates the starting mood and tone tags, then links each story to the tone tag that matches its old `tone`
// field, and proposes a mood from that tone. Dry run by default; nothing is written without --apply.
//   npx tsx scripts/seedMoodTone.ts <table-suffix>            (dry run)
//   npx tsx scripts/seedMoodTone.ts <table-suffix> --apply
// Safe to re-run: tags are found by type + name, links are only added when missing, and a story that already
// has a mood link is left alone. Stories with no old tone get no links (set them by hand in the CMS).
// The DynamoDB streams then keep tag counts and the live/band index fields current, as for any new link.
import { randomUUID } from 'crypto';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const suffix = process.argv[2];
const apply = process.argv.includes('--apply');
if (!suffix || suffix.startsWith('--')) { console.error('Usage: npx tsx scripts/seedMoodTone.ts <table-suffix> [--apply]'); process.exit(1); }
const client = new DynamoDBClient({ region: 'us-east-2' });
const TAG = `Tag-${suffix}-NONE`, STORY = `Story-${suffix}-NONE`, LINK = `StoryTag-${suffix}-NONE`;

const TONES: Record<string, string> = {
  FUNNY: 'Funny', DARK: 'Dark', SUSPENSEFUL: 'Suspenseful', WHIMSICAL: 'Whimsical', ROMANTIC: 'Romantic',
  EERIE: 'Eerie', THOUGHT_PROVOKING: 'Thought-provoking', HOPEFUL: 'Hopeful', MELANCHOLIC: 'Melancholic', ADVENTUROUS: 'Adventurous',
};
// Starting moods, in picker order. The CMS can add more or reorder them later.
const MOODS = ['Inspiring and uplifting', 'Dark and scary', 'Light and whimsical', 'Thought-provoking', 'Existential'];
// Proposed mood for an old tone. Romantic, Adventurous and Melancholic are left for a person to decide.
const MOOD_FOR_TONE: Record<string, string> = {
  DARK: 'Dark and scary', EERIE: 'Dark and scary', SUSPENSEFUL: 'Dark and scary',
  WHIMSICAL: 'Light and whimsical', FUNNY: 'Light and whimsical',
  HOPEFUL: 'Inspiring and uplifting', THOUGHT_PROVOKING: 'Thought-provoking',
};

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
  const tags = await scanAll(TAG);
  const idByKey = new Map<string, string>();               // `${type}:${nameLower}` -> id
  for (const t of tags) if (t.tagType?.S && t.nameLower?.S && t.id?.S) idByKey.set(`${t.tagType.S}:${t.nameLower.S}`, t.id.S);

  const ensureTag = async (type: 'tone' | 'mood', name: string, order?: number) => {
    const key = `${type}:${name.toLowerCase()}`;
    const have = idByKey.get(key);
    if (have) return have;
    const id = randomUUID();
    console.log(`${apply ? 'create' : 'would create'} ${type} tag "${name}"`);
    if (apply) {
      const item: any = {
        __typename: { S: 'Tag' }, id: { S: id }, name: { S: name }, nameLower: { S: name.toLowerCase() },
        searchPk: { S: 'REGULAR' }, primaryFlag: { S: 'false' }, isPrimary: { BOOL: false }, isErotic: { BOOL: false },
        color: { S: '#00ffff' }, tagType: { S: type }, createdAt: { S: now }, updatedAt: { S: now },
      };
      if (type === 'mood') { item.sortOrder = { N: String(order) }; item.pickerEnabled = { BOOL: true }; }
      await client.send(new PutItemCommand({ TableName: TAG, Item: item }));
    }
    idByKey.set(key, id);
    return id;
  };

  const toneIds: Record<string, string> = {};
  for (const [enumVal, name] of Object.entries(TONES)) toneIds[enumVal] = await ensureTag('tone', name);
  const moodIds: Record<string, string> = {};
  let order = 1;
  for (const name of MOODS) moodIds[name] = await ensureTag('mood', name, order++);

  const stories = await scanAll(STORY);
  const links = await scanAll(LINK);
  const have = new Set(links.map(l => `${l.storyId?.S}|${l.tagId?.S}`));
  const moodTagIds = new Set(Object.values(moodIds));
  const storiesWithMood = new Set(links.filter(l => moodTagIds.has(l.tagId?.S)).map(l => l.storyId?.S));

  let toneLinks = 0, moodLinks = 0, noTone = 0, noMood = 0;
  const needMood: string[] = [];
  const addLink = async (storyId: string, tagId: string) => {
    have.add(`${storyId}|${tagId}`);
    if (!apply) return;
    await client.send(new PutItemCommand({
      TableName: LINK,
      Item: { __typename: { S: 'StoryTag' }, id: { S: randomUUID() }, storyId: { S: storyId }, tagId: { S: tagId }, createdAt: { S: now }, updatedAt: { S: now } },
    }));
  };
  for (const s of stories) {
    const storyId = s.id?.S; if (!storyId) continue;
    const tone = s.tone?.S;
    if (!tone || !toneIds[tone]) { noTone++; if (!storiesWithMood.has(storyId)) needMood.push(s.title?.S ?? storyId); continue; }
    if (!have.has(`${storyId}|${toneIds[tone]}`)) { await addLink(storyId, toneIds[tone]); toneLinks++; }
    const moodName = MOOD_FOR_TONE[tone];
    if (storiesWithMood.has(storyId)) continue;
    if (!moodName) { noMood++; needMood.push(`${s.title?.S ?? storyId} (${tone})`); continue; }
    await addLink(storyId, moodIds[moodName]); moodLinks++;
    console.log(`  ${s.title?.S ?? storyId}: ${tone} -> ${moodName}`);
  }
  console.log({ apply, stories: stories.length, toneLinks, moodLinks, storiesWithoutTone: noTone, moodLeftForYou: noMood });
  if (needMood.length) console.log('Set a mood by hand in the CMS for:\n  ' + needMood.join('\n  '));
  if (!apply) console.log('Dry run only. Add --apply to write.');
}
main().catch(e => { console.error(e); process.exit(1); });
