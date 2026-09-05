import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Fetches the full StoryNarrator join table. This stays small by nature —
// most stories are AI-narrated and have zero rows here, since a row only
// exists for stories with an actual human narrator credited. Safe to fetch
// in full, same reasoning as useAuthors().
export function useStoryNarratorLinks() {
  return useQuery({
    queryKey: ['storyNarratorLinks'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.StoryNarrator.list({ limit: 500 });
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}
