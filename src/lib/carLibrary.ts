import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import { audioLinks, isCdnPath } from './audioLinks';
import { fetchTrendingSnapshot, fetchAllTimePopular, TREND_DEFAULT_DAYS } from './trending';
import { resumePoint, type CarStory } from '../features/audio/carBrowseTree';

// Loads what the car list shows: the same index queries the phone uses (newest-listened first for in-progress,
// pin order for the playlist), capped, so cost does not grow with the catalog or a person's history.
// The car never shows mature stories, regardless of the phone's setting, and leaves out stories the person's
// plan cannot play.

const FETCH_IN_PROGRESS = 30;
const FETCH_PINNED = 40;
const FETCH_TRENDING = 25;
const TRENDING_TTL_MS = 10 * 60 * 1000;

// Trending is the same for everyone and changes hourly, so the car list does not re-read it on every refresh.
let trendingCache: { at: number; stories: any[] } | null = null;
async function loadTrending(): Promise<any[]> {
  if (trendingCache && Date.now() - trendingCache.at < TRENDING_TTL_MS) return trendingCache.stories;
  const recent = await fetchTrendingSnapshot(TREND_DEFAULT_DAYS, FETCH_TRENDING);
  const stories = recent.length ? recent : await fetchAllTimePopular(FETCH_TRENDING);
  if (stories.length) trendingCache = { at: Date.now(), stories };
  return stories;
}

export async function loadCarStories(opts: { isPremium: boolean }): Promise<{ continueListening: CarStory[]; playlist: CarStory[]; trending: CarStory[] }> {
  const client = generateClient<Schema>();
  const { userId } = await getCurrentUser();

  const [inProg, pinned, trendingStories]: any[] = await Promise.all([
    (client.models.UserInProgressStory as any).listUserInProgressStoryByUserIdAndLastListenedAt(
      { userId }, { sortDirection: 'DESC', limit: FETCH_IN_PROGRESS }),
    (client.models.UserPinnedStory as any).listUserPinnedStoryByUserIdAndSortOrder(
      { userId }, { sortDirection: 'ASC', limit: FETCH_PINNED }),
    loadTrending(),
  ]);
  if (inProg.errors?.length) throw new Error(inProg.errors[0].message);
  if (pinned.errors?.length) throw new Error(pinned.errors[0].message);

  const inProgIds: string[] = (inProg.data ?? []).map((r: any) => r.storyId);
  const progress = new Map<string, number>((inProg.data ?? []).map((r: any) => [r.storyId, r.progressSeconds ?? 0]));
  const pinnedIds: string[] = (pinned.data ?? []).map((r: any) => r.storyId);
  const ids = [...new Set([...inProgIds, ...pinnedIds])];

  const stories = new Map<string, any>();
  // Trending stories arrive whole; ones already in progress or pinned stay in those folders only.
  const mine = new Set(ids);
  const trendingIds: string[] = [];
  for (const t of trendingStories as any[]) {
    if (!t?.id || mine.has(t.id) || stories.has(t.id)) continue;
    stories.set(t.id, t);
    trendingIds.push(t.id);
  }
  await Promise.all(ids.map(async id => {
    const { data } = await client.models.Story.get({ id });
    if (data) stories.set(id, data);
  }));

  // Premium rule matches useIsLocked: story flag wins, else the genre's flag.
  const needTags = [...new Set([...stories.values()]
    .filter(s => !opts.isPremium && s.isPremium == null && s.primaryTagId).map(s => s.primaryTagId as string))];
  const premiumTag = new Map<string, boolean>();
  await Promise.all(needTags.map(async id => {
    const { data } = await client.models.Tag.get({ id });
    premiumTag.set(id, data?.isPremiumGenre === true);
  }));

  const playable = (s: any) => {
    if (!s || s.live !== 'true' || s.isErotic === 'true' || !s.audioUri) return false;
    if (opts.isPremium) return true;
    if (s.isPremium === true) return false;
    if (s.isPremium === false) return true;
    return !(s.primaryTagId && premiumTag.get(s.primaryTagId));
  };

  const keepIds = [...ids, ...trendingIds].filter(id => playable(stories.get(id)));
  const authorIds = [...new Set(keepIds.map(id => stories.get(id).authorId).filter(Boolean))] as string[];
  const authorName = new Map<string, string>();
  await Promise.all(authorIds.map(async id => {
    const { data } = await client.models.Author.get({ id });
    if (data?.name) authorName.set(id, data.name);
  }));

  const paths = keepIds.flatMap(id => {
    const s = stories.get(id);
    return [s.audioUri, s.imageUri].filter((p: any) => typeof p === 'string' && isCdnPath(p));
  });
  const links = await audioLinks.getMany(paths);

  const toCar = (id: string): CarStory | null => {
    const s = stories.get(id);
    const audioUrl = links[s.audioUri] ?? (/^https?:/.test(s.audioUri) ? s.audioUri : undefined);
    if (!audioUrl) return null;
    return {
      id,
      title: s.title,
      artist: s.authorId ? authorName.get(s.authorId) : undefined,
      audioUrl,
      artworkUrl: s.imageUri ? links[s.imageUri] : undefined,
      duration: s.duration ?? undefined,
      startSeconds: resumePoint(progress.get(id), s.duration),
    };
  };
  const keep = new Set(keepIds);
  const build = (list: string[]) => list.filter(id => keep.has(id)).map(toCar).filter((x): x is CarStory => !!x);
  return { continueListening: build(inProgIds), playlist: build(pinnedIds), trending: build(trendingIds) };
}
