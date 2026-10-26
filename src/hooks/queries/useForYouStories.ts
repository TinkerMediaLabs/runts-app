import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { mixRoundRobin } from '../../lib/mixStories';
import { fetchTrendingSnapshot } from '../../lib/trending';
import type { Schema } from '../../../amplify/data/resource';

const PER_TAG = 12;   // a few spare, since stories already listened to are skipped
const NEWEST = 8;

// The Home carousel, a round-robin mix (so no source crowds the others) of: the most-listened live stories
// of the genres the listener picked, of up to 2 more genres their listening history points to, what is
// popular right now (last 7 days), and the newest. Stories they have already listened to are skipped.
// Every call is a handful of small indexed queries, so it costs the same with 7 stories or 7,000.
export type ForYouTaste = { learnedTagIds: string[]; listenedIds: string[]; ready: boolean };

export function useForYouStories(preferredTagIds: string[], limit: number = 8, taste?: ForYouTaste) {
  const key = preferredTagIds.join(',');
  const learned = taste?.learnedTagIds ?? [];
  const listened = taste?.listenedIds ?? [];
  return useQuery({
    queryKey: ['stories', 'forYou', key, limit, learned.join(','), listened.length],
    enabled: taste ? taste.ready : true,
    queryFn: async () => {
      const client = generateClient<Schema>();
      const safe = async (p: Promise<any>): Promise<any[]> => { try { return (await p)?.data ?? []; } catch { return []; } };

      const tagIds = [...preferredTagIds.slice(0, 3), ...learned.filter(id => !preferredTagIds.includes(id)).slice(0, 2)];
      const newestP = safe((client.models.Story as any).listStoryByLiveAndPublishedAt(
        { live: 'true' }, { sortDirection: 'DESC', limit: tagIds.length ? NEWEST : Math.max(limit, 20) }));
      const tagPs = tagIds.map(id =>
        safe((client.models.Story as any).listStoryByLiveTagIdAndNumListens(
          { liveTagId: id }, { sortDirection: 'DESC', limit: PER_TAG })));
      const trendingP = fetchTrendingSnapshot(7, PER_TAG);
      const [newest, trending, ...byTag] = await Promise.all([newestP, trendingP, ...tagPs]);

      // Popular right now sits between the genre lists and the newest, so it shapes the carousel without
      // pushing out what the listener asked for. Empty (new catalog) -> the mix is as before.
      return mixRoundRobin([...byTag, trending, newest], limit, new Set(listened));
    },
    staleTime: 1000 * 60 * 5,
  });
}
