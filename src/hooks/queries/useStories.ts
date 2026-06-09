import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

// ─── All live stories sorted by newest ───────────────────────────────────────
export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.listStoryByLiveAndPublishedAt(
        { live: 'true' },
        { sortDirection: 'DESC' }
      );
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by tag sorted by newest ─────────────────────────────────────────
export function useStoriesByTagNew(tagId: string) {
  return useQuery({
    queryKey: ['stories', 'tag', 'new', tagId],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.listStoryByPrimaryTagIdAndPublishedAt(
        { primaryTagId: tagId },
        { sortDirection: 'DESC' }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by tag sorted by listens (trending) ─────────────────────────────
export function useStoriesByTagTrending(tagId: string) {
  return useQuery({
    queryKey: ['stories', 'tag', 'trending', tagId],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.listStoryByPrimaryTagIdAndNumListens(
        { primaryTagId: tagId },
        { sortDirection: 'DESC' }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useStoriesByStoryTag(tagId: string) {
    return useQuery({
        queryKey: ['stories', 'storyTag', tagId],
        queryFn: async () => {
            const { data: links } = await client.models.StoryTag.list({
                filter: { tagId: { eq: tagId } },
            });
            if (!links?.length) return [];

            const results = await Promise.all(
                links.map((st: any) => client.models.Story.get({ id: st.storyId }))
            );

            return results
                .map(r => r.data)
                .filter(Boolean)
                .filter((s: any) => s.live === 'true')
                .sort((a: any, b: any) =>
                    new Date(b.publishedAt ?? 0).getTime() -
                    new Date(a.publishedAt ?? 0).getTime()
                );
        },
        enabled: !!tagId,
        staleTime: 1000 * 60 * 5,
    });
}

// ─── Stories by tag sorted by duration (short & sweet) ───────────────────────
export function useStoriesByTagShort(tagId: string, maxDuration: number = 1200) {
  return useQuery({
    queryKey: ['stories', 'tag', 'short', tagId],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.listStoryByPrimaryTagIdAndDuration(
        { primaryTagId: tagId },
        { sortDirection: 'ASC' }
      );
      if (errors) throw new Error(errors[0].message);
      // Filter client-side for duration under threshold
      return (data ?? []).filter(s => (s.duration ?? 0) <= maxDuration);
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Trending globally ────────────────────────────────────────────────────────
export function useTrendingStories() {
  return useQuery({
    queryKey: ['stories', 'trending'],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.listStoryByLiveAndNumListens(
        { live: 'true' },
        { sortDirection: 'DESC' }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by author ────────────────────────────────────────────────────────
export function useStoriesByAuthor(authorId: string) {
  return useQuery({
    queryKey: ['stories', 'author', authorId],
    queryFn: async () => {
      const { data, errors } = await client.models.Story.listStoryByAuthorIdAndPublishedAt(
        { authorId },
        { sortDirection: 'DESC' }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    enabled: !!authorId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Single story ─────────────────────────────────────────────────────────────
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