import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { DynamoDBClient, BatchGetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { validatePaths, buildLinks, validateStoryIds, guestAllowedPaths, assertGuestPaths, eroticPathSet, needsEroticList, type GuestStory } from './links';
import { createPremiumChecker, premiumAudioSet, splitPremiumPaths, needsPremiumList } from './premium';

const dynamo = new DynamoDBClient({});

// Every file used by erotic stories and erotic tags, read from the indexes (stories by byEroticAndPublishedAt, tags
// by the erotic half of byName) and kept for 5 minutes in a warm function. A failed read throws, so a guest is
// refused rather than let through.
const EROTIC_TTL_MS = 5 * 60 * 1000;
let eroticCache: { at: number; paths: Set<string> } | null = null;

async function queryAll(table: string, index: string, keyAttr: string, keyValue: string, projection: string) {
  const rows: Record<string, unknown>[] = [];
  let start: Record<string, any> | undefined;
  do {
    const res = await dynamo.send(new QueryCommand({
      TableName: table, IndexName: index, KeyConditionExpression: '#k = :v',
      ExpressionAttributeNames: { '#k': keyAttr }, ExpressionAttributeValues: { ':v': { S: keyValue } },
      ProjectionExpression: projection, ExclusiveStartKey: start,
    }));
    for (const item of res.Items ?? []) rows.push(unmarshall(item));
    start = res.LastEvaluatedKey;
  } while (start);
  return rows;
}

async function eroticPaths(storyTable: string, tagTable: string): Promise<Set<string>> {
  if (eroticCache && Date.now() - eroticCache.at < EROTIC_TTL_MS) return eroticCache.paths;
  const [stories, tags] = await Promise.all([
    queryAll(storyTable, 'byEroticAndPublishedAt', 'isErotic', 'true', 'imageUri, tileImageUri, audioUri, previewUri'),
    queryAll(tagTable, 'byName', 'searchPk', 'EROTIC', 'imageUri, tileImageUri, heroImageUri'),
  ]);
  const paths = eroticPathSet([...stories, ...tags]);
  eroticCache = { at: Date.now(), paths };
  return paths;
}

// Which of the requested audio files belong to premium stories: a direct read by path from the PremiumAudio table
// (at most 50 paths per request, so one batch). A failed read throws, so a free listener is refused rather than let through.
async function premiumAmong(table: string, audioPaths: string[]): Promise<Set<string>> {
  if (audioPaths.length === 0) return new Set();
  const res = await dynamo.send(new BatchGetItemCommand({
    RequestItems: { [table]: { Keys: audioPaths.map(id => ({ id: { S: id } })), ProjectionExpression: 'id' } },
  }));
  if (res.UnprocessedKeys && Object.keys(res.UnprocessedKeys).length) throw new Error('Premium check incomplete');
  return premiumAudioSet((res.Responses?.[table] ?? []).map(i => unmarshall(i)));
}

// Whether a signed-in person has Premium, asked of RevenueCat (at most once per person every 5 minutes per warm function).
const isPremiumUser = createPremiumChecker({
  fetchSubscriber: async (userId) => {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY ?? ''}` },
    });
    if (!res.ok) throw new Error(`RevenueCat lookup failed (${res.status})`);
    return ((await res.json()) as any).subscriber ?? {};
  },
});

// Signed-in users can ask for links to story files and author photos. The audio of a premium story is signed only
// for someone with Premium; for everyone else it is simply left out of the answer (the app shows it as locked).
// Guests (not signed in) get a stricter path: they name the stories they are viewing, and only covers of live,
// non-erotic stories and the audio of live, non-erotic, non-premium ones are signed (see links.ts).
export const handler = async (event: any): Promise<string> => {
  const signedIn = !!event.identity?.sub;
  const guest = !signedIn && event.identity?.cognitoIdentityAuthType === 'unauthenticated';
  if (!signedIn && !guest) throw new Error('Not authorized');

  const domain = process.env.AUDIO_CDN_DOMAIN;
  const keyPairId = process.env.AUDIO_KEY_PAIR_ID;
  const keyB64 = process.env.CLOUDFRONT_PRIVATE_KEY_B64;
  if (!domain || !keyPairId || !keyB64) throw new Error('Audio links are not configured');

  let paths = validatePaths(event.arguments?.paths);

  if (guest) {
    const table = process.env.STORY_TABLE_NAME;
    const tagTable = process.env.TAG_TABLE_NAME;
    if (!table || !tagTable) throw new Error('Audio links are not configured');
    const ids = validateStoryIds(event.arguments?.storyIds);
    const stories: GuestStory[] = [];
    if (ids.length) {
      const res = await dynamo.send(new BatchGetItemCommand({
        RequestItems: { [table]: {
          Keys: ids.map(id => ({ id: { S: id } })),
          ProjectionExpression: 'id, live, isErotic, isPremium, imageUri, tileImageUri, audioUri, previewUri',
        } },
      }));
      for (const item of res.Responses?.[table] ?? []) stories.push(unmarshall(item) as GuestStory);
    }
    const erotic = needsEroticList(paths) ? await eroticPaths(table, tagTable) : new Set<string>();
    assertGuestPaths(paths, guestAllowedPaths(stories), erotic);
  }

  // The CMS (admin group) previews and plays everything, premium or not.
  const isAdmin = Array.isArray(event.identity?.groups) && event.identity.groups.includes('admin');
  if (signedIn && !isAdmin && needsPremiumList(paths)) {
    const table = process.env.PREMIUM_AUDIO_TABLE_NAME;
    if (!table) throw new Error('Audio links are not configured');
    const { open, locked } = splitPremiumPaths(paths, await premiumAmong(table, paths.filter(p => p.startsWith('stories/audio/'))));
    if (locked.length && !(await isPremiumUser(event.identity.sub))) paths = open;
  }

  const privateKey = Buffer.from(keyB64, 'base64').toString('utf8');
  return JSON.stringify(buildLinks({
    paths,
    domain,
    now: new Date(),
    sign: (url, expires) => getSignedUrl({ url, keyPairId, privateKey, dateLessThan: expires.toISOString() }),
  }));
};
