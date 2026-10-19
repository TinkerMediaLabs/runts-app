import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';

// Narrator names for ONE story: index query by storyId, then batched get by id.
export function useStoryNarratorNames(storyId: string | null | undefined) {
  return useQuery({
    queryKey: ['storyNarratorNames', storyId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const links = await fetchAllPages<any>(token =>
        client.models.StoryNarrator.listStoryNarratorByStoryId(
          { storyId: storyId as string }, { limit: 50, nextToken: token }) as any);
      if (!links.length) return [];
      const ids = [...new Set(links.map(l => l.narratorId))];
      const results = await Promise.all(ids.map(id => client.models.Narrator.get({ id })));
      return results.map(r => r.data?.name).filter(Boolean) as string[];
    },
    enabled: !!storyId,
    staleTime: 1000 * 60 * 10,
  });
}
