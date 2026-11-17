import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { mixWithReasons, type ReasonedList } from '../../lib/mixStories';
import { fetchTrendingSnapshot } from '../../lib/trending';
import type { Schema } from '../../../amplify/data/resource';

const PER_TAG = 12;   // a few spare, since stories already listened to are skipped
const NEWEST = 8;
const NEWEST_MAX = 60;   // upper bound for the widened newest list: still one small query

// The Home carousel, a round-robin mix (so no source crowds the others) of: the most-listened live stories
// of the genres the listener picked, of up to 2 more genres their listening history points to, what is
// popular right now (last 7 days), and the newest. Stories they have already listened to are skipped.
// Every call is a handful of small indexed queries, so it costs the same with 7 stories or 7,000.
export type ForYouTaste = { learnedTagIds: string[]; listenedIds: string[]; ready: boolean; followedTagIds?: string[] };

export function useForYouStories(preferredTagIds: string[], limit: number = 8, taste?: ForYouTaste) {
  const key = preferredTagIds.join(',');
  const learned = taste?.learnedTagIds ?? [];
  const listened = taste?.listenedIds ?? [];
  const followed = taste?.followedTagIds ?? [];
  return useQuery({
    queryKey: ['stories', 'forYou', key, limit, learned.join(','), followed.join(','), listened.length],
    enabled: taste ? taste.ready : true,
    queryFn: async () => {
      const client = generateClient<Schema>();
      const safe = async (p: Promise<any>): Promise<any[]> => { try { return (await p)?.data ?? []; } catch { return []; } };

      // Up to 3 picked genres, then up to 3 of the newest followed genres, then up to 2 learned from listening:
      // at most 8 small indexed queries however many genres the listener follows.
      const picked = preferredTagIds.slice(0, 3);
      const followedIds = followed.filter(id => !picked.includes(id)).slice(0, 3);
      const learnedIds = learned.filter(id => !preferredTagIds.includes(id) && !followedIds.includes(id)).slice(0, 2);
      const tagIds = [...picked, ...followedIds, ...learnedIds];
      // Every story already listened to (and every erotic one) takes a slot in this list and is then skipped, so
      // widen the window by that many; otherwise a listener who has heard the newest stories sees an empty carousel.
      const newestWindow = Math.min(NEWEST_MAX, (tagIds.length ? NEWEST : Math.max(limit, 20)) + listened.length + 10);
      const newestP = safe((client.models.Story as any).listStoryByLiveAndPublishedAt(
        { live: 'true' }, { sortDirection: 'DESC', limit: newestWindow }));
      const tagPs = tagIds.map(id =>
        safe((client.models.Story as any).listStoryByLiveTagIdAndNumListens(
          { liveTagId: id }, { sortDirection: 'DESC', limit: PER_TAG })));
      const trendingP = fetchTrendingSnapshot(7, PER_TAG);
      const [newest, trending, ...byTag] = await Promise.all([newestP, trendingP, ...tagPs]);

      // Popular right now sits between the genre lists and the newest, so it shapes the carousel without
      // pushing out what the listener asked for. Empty (new catalog) -> the mix is as before.
      // Each list knows why its stories are here, so every card can say so (see reasonText).
      const sources: ReasonedList[] = [
        ...byTag.map((stories, i) => ({
          reason: { kind: (i < picked.length ? 'picked' : i < picked.length + followedIds.length ? 'followed' : 'learned') as 'picked' | 'followed' | 'learned', tagId: tagIds[i] },
          stories,
        })),
        { reason: { kind: 'trending' as const }, stories: trending },
        { reason: { kind: 'new' as const }, stories: newest },
      ];
      return mixWithReasons(sources, limit, new Set(listened));
    },
    staleTime: 1000 * 60 * 5,
  });
}
