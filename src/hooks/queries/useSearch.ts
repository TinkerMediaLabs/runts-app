import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';



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
      const client = generateClient<Schema>();
      let data: any[] = [];
      let nextToken: string | null | undefined;
      const q = normalise(query);

      try {
        if (tagId) {
          // Tag-scoped GSI - partition liveTagId (live stories only, sparse)
          if (sortBy === 'popular') {
            const res = await (client.models.Story as any).listStoryByLiveTagIdAndNumListens(
              { liveTagId: tagId },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          } else if (sortBy === 'shortest') {
            const res = await (client.models.Story as any).listStoryByLiveTagIdAndDuration(
              { liveTagId: tagId },
              { sortDirection: 'ASC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          } else {
            // newest
            const res = await (client.models.Story as any).listStoryByLiveTagIdAndPublishedAt(
              { liveTagId: tagId },
              { sortDirection: 'DESC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
            nextToken = res.nextToken;
          }
        } else if (q.length >= 2 && sortBy === 'newest') {
          // Title-prefix search runs on the byLiveAndTitle index (server-side), so matches are found
          // across the whole catalog instead of only within the page that happened to load.
          // Substring / summary / description search needs a dedicated search service (see handoff).
          const res = await (client.models.Story as any).listStoryByLiveAndTitleLower(
            { live: 'true', titleLower: { beginsWith: q } },
            { limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
          );
          data = res.data ?? [];
          nextToken = res.nextToken;
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
            // byLiveAndDuration index: truly globally shortest-first, paginated server-side
            const res = await (client.models.Story as any).listStoryByLiveAndDuration(
              { live: 'true' },
              { sortDirection: 'ASC', limit: SEARCH_PAGE_SIZE, nextToken: pageParam }
            );
            data = res.data ?? [];
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
        // No unindexed fallback on purpose (a filtered list() silently drops rows at scale).
        throw err;
      }

      // Apply text query + duration filter client-side
      const serverTitleSearch = !tagId && q.length >= 2 && sortBy === 'newest';
      const filtered = data.filter((s: any) =>
        (serverTitleSearch || storyMatchesQuery(s, query)) &&
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
// Authors — paginated (mirrors Stories pattern), client-side text filter
// per page. Never assume the table is small enough to fetch in full —
// paginate now so this scales the same way as Stories as the author
// catalog grows.
// ---------------------------------------------------------------------------

export function useSearchAuthors({
  query,
  enabled,
}: {
  query: string;
  enabled: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ['searchAuthors', query],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const client = generateClient<Schema>();
      const q = normalise(query);
      // byName index: prefix match on nameLower, server-side + paginated.
      const key = q.length >= 2 ? { searchPk: 'ALL', nameLower: { beginsWith: q } } : { searchPk: 'ALL' };
      const { data, nextToken } = await (client.models.Author as any).listAuthorBySearchPkAndNameLower(key, {
        limit: SEARCH_PAGE_SIZE,
        nextToken: pageParam,
      });
      return { items: (data ?? []) as any[], nextToken: (nextToken ?? null) as string | null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// Tags live in two partitions (REGULAR then EROTIC). Pages are walked REGULAR first, then EROTIC.
type TagPage = { part: 'REGULAR' | 'EROTIC'; token?: string };

export function useSearchTags({
  query,
  enabled,
  includeErotic = true,
}: {
  query: string;
  enabled: boolean;
  includeErotic?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ['searchTags', query, includeErotic],
    queryFn: async ({ pageParam }: { pageParam: TagPage }) => {
      const client = generateClient<Schema>();
      const q = normalise(query);
      const key = (searchPk: string) =>
        q.length >= 2 ? { searchPk, nameLower: { beginsWith: q } } : { searchPk };
      const { data, nextToken } = await (client.models.Tag as any).listTagBySearchPkAndNameLower(key(pageParam.part), {
        limit: SEARCH_PAGE_SIZE,
        nextToken: pageParam.token,
      });
      let next: TagPage | null = nextToken ? { part: pageParam.part, token: nextToken } : null;
      if (!next && pageParam.part === 'REGULAR' && includeErotic) next = { part: 'EROTIC' };
      return { items: (data ?? []) as any[], next };
    },
    initialPageParam: { part: 'REGULAR' } as TagPage,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
