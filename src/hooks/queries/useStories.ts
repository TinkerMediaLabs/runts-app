import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// SCALE NOTE: AppSync returns ONE page (default 100 rows) per call. Every hook below that feeds a
// horizontal strip asks for an explicit `limit` (top-N is the intended product behaviour). Anything
// that must show "all" uses the *Paginated infinite hooks.
const STRIP_LIMIT = 20;



// ─── Newest live stories (first STRIP_LIMIT only — NOT the whole catalog) ────
// Callers that need more must use useStoriesPaginated().
export function useStories(limit: number = STRIP_LIMIT) {
  return useQuery({
    queryKey: ['stories', limit],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Story.listStoryByLiveAndPublishedAt(
        { live: 'true' },
        { sortDirection: 'DESC', limit }
      );
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── All live stories, paginated (infinite scroll / load-more) ───────────────
export function useStoriesPaginated(pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: ['stories', 'paginated', pageSize],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const client = generateClient<Schema>();
      const { data, errors, nextToken } = await client.models.Story.listStoryByLiveAndPublishedAt(
        { live: 'true' },
        { sortDirection: 'DESC', limit: pageSize, nextToken: pageParam ?? undefined }
      );
      if (errors) throw new Error(errors[0].message);
      return { items: data ?? [], nextToken: nextToken ?? null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by tag sorted by newest ─────────────────────────────────────────
export function useStoriesByTagNew(tagId: string) {
  return useQuery({
    queryKey: ['stories', 'tag', 'new', tagId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Story.listStoryByPrimaryTagIdAndPublishedAt(
        { primaryTagId: tagId },
        { sortDirection: 'DESC', limit: STRIP_LIMIT }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by tag, paginated (for "Browse all" infinite scroll) ───────────
export function useStoriesByTagPaginated(tagId: string) {
  return useInfiniteQuery({
    queryKey: ['stories', 'tag', 'paginated', tagId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const client = generateClient<Schema>();
      const { data, errors, nextToken } = await client.models.Story.listStoryByPrimaryTagIdAndPublishedAt(
        { primaryTagId: tagId },
        { sortDirection: 'DESC', limit: 10, nextToken: pageParam ?? undefined }
      );
      if (errors) throw new Error(errors[0].message);
      return { items: data ?? [], nextToken: nextToken ?? null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken,
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by tag sorted by listens (trending) ─────────────────────────────
export function useStoriesByTagTrending(tagId: string) {
  return useQuery({
    queryKey: ['stories', 'tag', 'trending', tagId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Story.listStoryByPrimaryTagIdAndNumListens(
        { primaryTagId: tagId },
        { sortDirection: 'DESC', limit: STRIP_LIMIT }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
}

// Stories carrying a tag via the StoryTag join table — paginated: index byTagId (page of links),
// then batched Story.get for that page only. `useInfiniteQuery` result: pages[].items.
// NOTE: join order is by link id, not publishedAt; sort within the page if you need recency.
export function useStoriesByStoryTag(tagId: string, pageSize: number = 20) {
    return useInfiniteQuery({
        queryKey: ['stories', 'storyTag', tagId, pageSize],
        queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const client = generateClient<Schema>();
            const { data: links, nextToken, errors } = await (client.models.StoryTag as any).listStoryTagByTagId(
                { tagId }, { limit: pageSize, nextToken: pageParam ?? undefined });
            if (errors) throw new Error(errors[0].message);
            const results = await Promise.all((links ?? []).map((st: any) => client.models.Story.get({ id: st.storyId })));
            const items = results
                .map(r => r.data)
                .filter(Boolean)
                .filter((s: any) => s.live === 'true')
                .sort((a: any, b: any) =>
                    new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());
            return { items, nextToken: (nextToken ?? null) as string | null };
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextToken,
        enabled: !!tagId,
        staleTime: 1000 * 60 * 5,
    });
}

// ─── Stories by tag sorted by duration (short & sweet) ───────────────────────
export function useStoriesByTagShort(tagId: string, maxDuration: number = 1200) {
  return useQuery({
    queryKey: ['stories', 'tag', 'short', tagId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      // Duration is the index sort key, so the threshold is a key condition (server-side range),
      // not a post-fetch filter.
      const { data, errors } = await client.models.Story.listStoryByPrimaryTagIdAndDuration(
        { primaryTagId: tagId, duration: { le: maxDuration } },
        { sortDirection: 'ASC', limit: STRIP_LIMIT }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
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
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Story.listStoryByLiveAndNumListens(
        { live: 'true' },
        { sortDirection: 'DESC', limit: STRIP_LIMIT }
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
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Story.listStoryByAuthorIdAndPublishedAt(
        { authorId },
        { sortDirection: 'DESC', limit: 100 }
      );
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    enabled: !!authorId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Stories by author, paginated (use this wherever ALL of an author's stories are shown) ──
export function useStoriesByAuthorPaginated(authorId: string, pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: ['stories', 'author', 'paginated', authorId, pageSize],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const client = generateClient<Schema>();
      const { data, errors, nextToken } = await client.models.Story.listStoryByAuthorIdAndPublishedAt(
        { authorId },
        { sortDirection: 'DESC', limit: pageSize, nextToken: pageParam ?? undefined }
      );
      if (errors) throw new Error(errors[0].message);
      return { items: data ?? [], nextToken: nextToken ?? null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken,
    enabled: !!authorId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Single story ─────────────────────────────────────────────────────────────
export function useStory(id: string) {
  return useQuery({
    queryKey: ['story', id],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Story.get({ id });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Live stories whose title starts with a letter (Browse by Title), paged ──────────────────
// Server-side on the byLiveAndTitle index, so any letter works across the whole catalog.
// Length filtering is applied by the caller (the index has no duration sort key).
export function useStoriesByTitleLetterPaginated(letter: string, pageSize: number = 30) {
  return useInfiniteQuery({
    queryKey: ['stories', 'titleLetter', letter, pageSize],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.Story as any).listStoryByLiveAndTitleLower(
        { live: 'true', titleLower: { beginsWith: letter.toLowerCase() } },
        { limit: pageSize, nextToken: pageParam ?? undefined }
      );
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return { items: (res.data ?? []) as any[], nextToken: (res.nextToken ?? null) as string | null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextToken,
    enabled: !!letter,
    staleTime: 1000 * 60 * 5,
  });
}
