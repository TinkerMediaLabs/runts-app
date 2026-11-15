// Read-only check of what a guest (not signed in) can and cannot do against one environment.
//   npx tsx scripts/guestCheck.ts dev|staging|production
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { readFileSync } from 'node:fs';

const env = process.argv[2];
if (!['dev', 'staging', 'production'].includes(env ?? '')) { console.error('Usage: npx tsx scripts/guestCheck.ts dev|staging|production'); process.exit(1); }
Amplify.configure(JSON.parse(readFileSync(`amplify_outputs.${env}.json`, 'utf8')));
const client: any = generateClient({ authMode: 'identityPool' });

const ok = (label: string, pass: boolean, detail = '') => console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);

async function main() {
  // Catalog reads should work
  for (const m of ['Story', 'Tag', 'Author', 'Narrator', 'Universe', 'HomeSection', 'PickerOption', 'TrendingSnapshot']) {
    const r = await client.models[m].list({ limit: 1 });
    ok(`guest can read ${m}`, !r.errors?.length && (r.data ?? []).length >= 0, r.errors?.[0]?.message ?? `${(r.data ?? []).length} row(s)`);
  }
  // Personal data must be refused
  for (const m of ['User', 'UserPinnedStory', 'UserRating', 'UserBookmark']) {
    const r = await client.models[m].list({ limit: 1 });
    ok(`guest is refused ${m}`, !!r.errors?.length || (r.data ?? []).length === 0, r.errors?.[0]?.message?.slice(0, 60) ?? '0 rows');
  }
  // Audio links
  const stories: any[] = [];
  let next: string | null = null;
  do { const r: any = await client.models.Story.list({ limit: 100, nextToken: next }); stories.push(...(r.data ?? [])); next = r.nextToken ?? null; } while (next);
  const live = stories.filter(s => s.live === 'true');
  const free = live.find(s => s.isErotic !== 'true' && !s.isPremium && s.imageUri && s.audioUri);
  const erotic = stories.find(s => s.isErotic === 'true' && s.imageUri);
  const premium = live.find(s => s.isErotic !== 'true' && s.isPremium && s.audioUri);
  const ask = async (paths: string[], storyIds?: string[]) => {
    const r = await client.mutations.getAudioLinks({ paths, storyIds });
    return { ok: !r.errors?.length && !!r.data, err: r.errors?.[0]?.message ?? '' };
  };
  if (free) {
    const a = await ask([free.imageUri, free.audioUri], [free.id]);
    ok('guest gets cover + preview audio of a free story', a.ok, a.err);
  } else console.log('SKIP  no free live story found');
  if (erotic) {
    const a = await ask([erotic.imageUri], [erotic.id]);
    ok('guest is refused an erotic story cover', !a.ok, a.err);
  } else console.log('SKIP  no erotic story found');
  if (premium) {
    const a = await ask([premium.audioUri], [premium.id]);
    ok('guest is refused a premium story audio', !a.ok, a.err);
  } else console.log('SKIP  no premium story found');
  if (free) {
    const a = await ask([free.audioUri]);
    ok('guest is refused audio without naming the story', !a.ok, a.err);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
