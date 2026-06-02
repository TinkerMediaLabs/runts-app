import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export const SEARCH_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption     = 'newest' | 'popular' | 'shortest';
export type DurationFilter = 'any' | 'short' | 'medium' | 'long';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalise(str: string): string {
  return (str ?? '').toLowerCase().trim();
}

function storyMatchesQuery(story: any, query: string): boolean {
  if (!query || query.length < 2) return true;
  const q = normalise(query);
  return (
    normalise(story.title).includes(q) ||
    normalise(story.summary).includes(q) ||
    normalise(story.description).includes(q)
  );
}

function matchesDuration(story: any, filter: DurationFilter): boolean {
  if (filter === 'any') return true;
  const mins = (story.duration ?? 0) / 60;
  if (filter === 'short')  return mins < 15;
  if (filter === 'medium') return mins >= 15 && mins <= 30;
  if (filter === 'long')   return mins > 30;
  return true;
}

// ---------------------------------------------------------------------------
// Stories — paginated via GSI, client-side text + duration filter
//
// NOTE: If any GSI method throws "not a function", verify exact names via:
//   console.log(Object.keys(client.models.Story))
// Amplify Gen 2 pattern: listStoryBy[PartitionKeyField]And[SortKeyField]
// ---------------------------------------------------------------------------

export function useSearchStories({
  query,
  sortBy,
  tagId,
  duration,
  enabled,
}: {
  query: string;
  sortBy: SortOption;
  tagId: string | null;
  duration: DurationFilter;
  enabled: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ['searchStories', query, sortBy, tagId, duration],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let data: any[] = [];
      let nextToken: string | null | undefined;

      try {
        if (tagId) {
          // Tag-scoped GSI — partition by primaryTagId
          if (sortBy === 'popular') {
            const res = await (client.models.Story as any).listStoryByPrimaryTagIdAndNumListens(
              { primaryTagId: tagId },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          } else if (sortBy === 'shortest') {
            const res = await (client.models.Story as any).listStoryByPrimaryTagIdAndDuration(
              { primaryTagId: tagId },
              { sortDirection: 'ASC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          } else {
            // newest
            const res = await (client.models.Story as any).listStoryByPrimaryTagIdAndPublishedAt(
              { primaryTagId: tagId },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          }
          // Enforce live filter (tag GSI doesn't partition by live)
          data = data.filter((s: any) => s.live === 'true');
        } else {
          // Live-scoped GSI — partition by live = "true"
          if (sortBy === 'popular') {
            const res = await (client.models.Story as any).listStoryByLiveAndNumListens(
              { live: 'true' },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          } else if (sortBy === 'shortest') {
            // No GSI for shortest without tag — use newest GSI and sort client-side
            const res = await (client.models.Story as any).listStoryByLiveAndPublishedAt(
              { live: 'true' },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = (res.data ?? []).sort((a: any, b: any) => (a.duration ?? 0) - (b.duration ?? 0));
            nextToken = res.nextToken;
          } else {
            // newest
            const res = await (client.models.Story as any).listStoryByLiveAndPublishedAt(
              { live: 'true' },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          }
        }
      } catch (err) {
        // Fallback: plain list with live filter if GSI methods aren't available
        console.warn('GSI method unavailable, falling back to list:', err);
        const res = await client.models.Story.list({
          filter: { live: { eq: 'true' } },
          limit: SEARCH_PAGE_SIZE,
          nextToken: pageParam,
        });
        data = res.data ?? [];
        nextToken = res.nextToken;
      }

      // Apply text query + duration filter client-side
      const filtered = data.filter((s: any) =>
        storyMatchesQuery(s, query) &&
        matchesDuration(s, duration)
      );

      return { items: filtered, nextToken: nextToken ?? null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled,
    staleTime: 1000 * 30,
  });
}

// ---------------------------------------------------------------------------
// Authors — full list, client-side filter (authors list is small)
// ---------------------------------------------------------------------------

export function useSearchAuthors({
  query,
  enabled,
}: {
  query: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ['searchAuthors', query],
    queryFn: async () => {
      const { data } = await client.models.Author.list();
      if (!query || query.length < 2) return data ?? [];
      const q = normalise(query);
      return (data ?? []).filter(a =>
        normalise(a.name).includes(q) ||
        normalise(a.bio ?? '').includes(q)
      );
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// Tags — full list, client-side filter (fixed small set)
// ---------------------------------------------------------------------------

export function useSearchTags({
  query,
  enabled,
}: {
  query: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ['searchTags', query],
    queryFn: async () => {
      const { data } = await client.models.Tag.list();
      if (!query || query.length < 2) return data ?? [];
      const q = normalise(query);
      return (data ?? []).filter(t =>
        normalise(t.name).includes(q)
      );
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}