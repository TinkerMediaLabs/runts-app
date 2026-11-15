import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { DynamoDBClient, BatchGetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { validatePaths, buildLinks, validateStoryIds, guestAllowedPaths, assertGuestPaths, eroticPathSet, needsEroticList, type GuestStory } from './links';

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
    queryAll(storyTable, 'byEroticAndPublishedAt', 'isErotic', 'true', 'imageUri, tileImageUri, audioUri'),
    queryAll(tagTable, 'byName', 'searchPk', 'EROTIC', 'imageUri, tileImageUri, heroImageUri'),
  ]);
  const paths = eroticPathSet([...stories, ...tags]);
  eroticCache = { at: Date.now(), paths };
  return paths;
}

// Signed-in users can ask for links to any story file or author photo (the same access they have to the bucket today).
// Checking that a free user may not get a premium story's link is a later hardening step (needs RevenueCat).
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

  const paths = validatePaths(event.arguments?.paths);

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
          ProjectionExpression: 'id, live, isErotic, isPremium, imageUri, tileImageUri, audioUri',
        } },
      }));
      for (const item of res.Responses?.[table] ?? []) stories.push(unmarshall(item) as GuestStory);
    }
    const erotic = needsEroticList(paths) ? await eroticPaths(table, tagTable) : new Set<string>();
    assertGuestPaths(paths, guestAllowedPaths(stories), erotic);
  }

  const privateKey = Buffer.from(keyB64, 'base64').toString('utf8');
  return JSON.stringify(buildLinks({
    paths,
    domain,
    now: new Date(),
    sign: (url, expires) => getSignedUrl({ url, keyPairId, privateKey, dateLessThan: expires.toISOString() }),
  }));
};
