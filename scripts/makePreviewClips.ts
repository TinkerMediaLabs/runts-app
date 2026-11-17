// Makes the 30-second Preview clip of each story from its full MP3 and records it on the story (previewUri).
// The clip is a separate small file under stories/previews/, so free listeners can hear a Preview of a premium
// story without the server ever handing them the full audio.
//
//   npx tsx scripts/makePreviewClips.ts <env>                     dry run: lists what it would do, writes nothing
//   npx tsx scripts/makePreviewClips.ts <env> --apply             makes the clips and sets previewUri
//   npx tsx scripts/makePreviewClips.ts <env> --apply --force     also redoes stories that already have a clip
//   npx tsx scripts/makePreviewClips.ts <env> --apply --slug the-black-cat     only that story (slug = file name)
//
// env = dev | staging | production. The clip starts at the story's previewStartSeconds (blank = 60 s, kept inside
// the story). It is cut from whole MP3 frames (no re-encoding), see src/lib/mp3Clip.ts. Reads the audio and writes
// the clip in the SAME environment's bucket; only stories/previews/ files and Story.previewUri are written.
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cutMp3 } from '../src/lib/mp3Clip';

const REGION = 'us-east-2';
const SUFFIX: Record<string, string> = {
  dev: 'ksza7azahbfobkmlxyzaoqnhf4',
  staging: '5ojmsd7i5nbq5foh2wefkdhj3e',
  production: 'nzvkuznrzjfc5kud3vfik5j7ey',
};
const CLIP_SECONDS = 30;
const DEFAULT_START = 60;   // same default as the app (src/features/audio/preview.ts)

const env = process.argv[2];
const apply = process.argv.includes('--apply');
const force = process.argv.includes('--force');
const slugIdx = process.argv.indexOf('--slug');
const onlySlug = slugIdx > -1 ? process.argv[slugIdx + 1] : null;
if (!SUFFIX[env]) { console.error('Usage: npx tsx scripts/makePreviewClips.ts <dev|staging|production> [--apply] [--force] [--slug <slug>]'); process.exit(1); }

const outputs = JSON.parse(readFileSync(join(process.cwd(), `amplify_outputs.${env}.json`), 'utf8'));
const bucket: string = outputs.storage.bucket_name;
const table = `Story-${SUFFIX[env]}-NONE`;
const s3 = new S3Client({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });

async function getBytes(key: string): Promise<Uint8Array> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return await res.Body!.transformToByteArray();
}

async function main() {
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} · ${env} · bucket ${bucket} · table ${table}${force ? ' · force' : ''}${onlySlug ? ` · only ${onlySlug}` : ''}\n`);
  const stories: any[] = [];
  let lastKey: any;
  do {
    const res: any = await ddb.send(new ScanCommand({
      TableName: table, ExclusiveStartKey: lastKey,
      ProjectionExpression: 'id, title, audioUri, previewUri, previewStartSeconds, isPremium',
    }));
    stories.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  let made = 0, skipped = 0, failed = 0;
  for (const it of stories) {
    const id: string = it.id.S;
    const title: string = it.title?.S ?? id;
    const audio: string | undefined = it.audioUri?.S;
    const has = !!it.previewUri?.S;
    if (!audio || !audio.startsWith('stories/audio/') || !/\.mp3$/i.test(audio)) { console.log(`skip   ${title}: no stories/audio/*.mp3 file`); skipped++; continue; }
    const slug = audio.slice('stories/audio/'.length).replace(/\.mp3$/i, '');
    if (onlySlug && slug !== onlySlug) continue;
    if (has && !force) { console.log(`skip   ${title}: already has ${it.previewUri.S}`); skipped++; continue; }
    const clipKey = `stories/previews/${slug}.mp3`;
    const start = it.previewStartSeconds?.N != null ? Math.max(0, Number(it.previewStartSeconds.N)) : DEFAULT_START;
    try {
      if (!apply) { console.log(`would  ${title}${it.isPremium?.BOOL ? ' [premium]' : ''}: ${audio} @ ${start}s -> ${clipKey}`); made++; continue; }
      const clip = cutMp3(await getBytes(audio), start, CLIP_SECONDS);
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: clipKey, Body: clip.bytes, ContentType: 'audio/mpeg' }));
      await ddb.send(new UpdateItemCommand({
        TableName: table, Key: { id: { S: id } },
        UpdateExpression: 'SET previewUri = :p, updatedAt = :u',
        ExpressionAttributeValues: { ':p': { S: clipKey }, ':u': { S: new Date().toISOString() } },
      }));
      console.log(`made   ${title}: ${clipKey} (${clip.seconds.toFixed(1)}s from ${clip.startSeconds.toFixed(1)}s of ${clip.totalSeconds.toFixed(0)}s, ${(clip.bytes.length / 1024).toFixed(0)} KB)`);
      made++;
    } catch (e: any) {
      console.log(`FAILED ${title}: ${e?.message ?? e}`);
      failed++;
    }
  }
  console.log(`\n${apply ? 'Made' : 'Would make'} ${made}, skipped ${skipped}, failed ${failed}.${apply ? '' : '  Re-run with --apply to write.'}`);
  if (failed) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
