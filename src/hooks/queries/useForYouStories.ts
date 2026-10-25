import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { mixRoundRobin } from '../../lib/mixStories';
import type { Schema } from '../../../amplify/data/resource';

const PER_TAG = 8;
const NEWEST = 8;
const TOTAL = 12;

// The Home carousel. With genres picked at onboarding it mixes the most-listened live stories of each
// chosen genre with the newest ones (round robin, so no genre crowds the others); without them it is just
// the newest. Every call is one small indexed query (at most 3 genres + 1 newest), so it costs the same
// with 7 stories or 7,000.
export function useForYouStories(preferredTagIds: string[]) {
  const key = preferredTagIds.join(',');
  return useQuery({
    queryKey: ['stories', 'forYou', key],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const safe = async (p: Promise<any>): Promise<any[]> => { try { return (await p)?.data ?? []; } catch { return []; } };

      const newestP = safe((client.models.Story as any).listStoryByLiveAndPublishedAt(
        { live: 'true' }, { sortDirection: 'DESC', limit: preferredTagIds.length ? NEWEST : 20 }));
      const tagPs = preferredTagIds.slice(0, 3).map(id =>
        safe((client.models.Story as any).listStoryByLiveTagIdAndNumListens(
          { liveTagId: id }, { sortDirection: 'DESC', limit: PER_TAG })));
      const [newest, ...byTag] = await Promise.all([newestP, ...tagPs]);

      if (!preferredTagIds.length) return newest;

      return mixRoundRobin([...byTag, newest], TOTAL);
    },
    staleTime: 1000 * 60 * 5,
  });
}
