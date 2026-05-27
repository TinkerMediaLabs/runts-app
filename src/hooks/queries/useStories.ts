import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

// ─── Fetch all live stories ───────────────────────────────────────────────
export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.list({
        filter: { live: { eq: true } },
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Fetch a single story by ID ───────────────────────────────────────────
export function useStory(id: string) {
  return useQuery({
    queryKey: ['story', id],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.get({ id });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Fetch stories by tag ─────────────────────────────────────────────────
export function useStoriesByTag(tagId: string) {
  return useQuery({
    queryKey: ['stories', 'tag', tagId],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.list({
        filter: {
          and: [
            { live: { eq: true } },
            { primaryTagId: { eq: tagId } },
          ],
        },
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}