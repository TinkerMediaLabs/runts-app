import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Paginated bookmark list — most recent first via byUserAndCreatedAt GSI
//
// NOTE: If the GSI method throws, verify the exact name with:
//   console.log(Object.keys(client.models.UserBookmark))
// ---------------------------------------------------------------------------

export function useBookmarks() {
  return useInfiniteQuery({
    queryKey: ['bookmarks'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const { userId } = await getCurrentUser();

      const { data, nextToken } = await (client.models.UserBookmark as any)
        .listUserBookmarkByUserIdAndCreatedAt(
          { userId },
          {
            sortDirection: 'DESC',
            limit:         PAGE_SIZE,
            nextToken:     pageParam,
          }
        );

      if (!data?.length) return { items: [], nextToken: null };

      // Fetch story data for this page in parallel
      const storyResults = await Promise.all(
        data.map((b: any) => client.models.Story.get({ id: b.storyId }))
      );

      return {
        items: data
          .map((bookmark: any, i: number) => ({
            bookmark,
            story: storyResults[i]?.data ?? null,
          }))
          .filter((item: any) => item.story !== null),
        nextToken: nextToken ?? null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    staleTime: 1000 * 60,
  });
}

// ---------------------------------------------------------------------------
// Create a bookmark
// ---------------------------------------------------------------------------

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storyId,
      positionSeconds,
      name,
    }: {
      storyId:         string;
      positionSeconds: number;
      name:            string;
    }) => {
      const { userId } = await getCurrentUser();
      return client.models.UserBookmark.create({
        userId,
        storyId,
        positionSeconds,
        name: name.trim() || 'My Bookmark',
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Delete a bookmark
// ---------------------------------------------------------------------------

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      return client.models.UserBookmark.delete({ id: bookmarkId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}