import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Resolves narrator names for one specific story, directly by ID — more
// efficient than fetching the full Narrator list when only one story's
// narrators are actually needed.
export function useStoryNarratorNames(storyId: string | null | undefined) {
  return useQuery({
    queryKey: ['storyNarratorNames', storyId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data: links } = await client.models.StoryNarrator.list({
        filter: { storyId: { eq: storyId as string } },
      });
      if (!links?.length) return [];
      const narratorResults = await Promise.all(
        links.map((link: any) => client.models.Narrator.get({ id: link.narratorId }))
      );
      return narratorResults.map(r => r.data?.name).filter(Boolean) as string[];
    },
    enabled: !!storyId,
    staleTime: 1000 * 60 * 10,
  });
}
