import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();
const PAGE_SIZE = 20;

// ── Check if following a specific author ──────────────────────────────────
export function useIsFollowing(authorId: string) {
  return useQuery({
    queryKey: ['isFollowing', authorId],
    queryFn: async () => {
      const { userId } = await getCurrentUser();
      const { data } = await client.models.UserFollowedAuthor.list({
        filter: { and: [{ userId: { eq: userId } }, { authorId: { eq: authorId } }] },
      });
      return { isFollowing: !!data?.length, recordId: data?.[0]?.id ?? null };
    },
    enabled: !!authorId,
    staleTime: 1000 * 30,
  });
}

// ── Following count (for profile screen stat) ─────────────────────────────
export function useFollowingCount() {
  return useQuery({
    queryKey: ['followingCount'],
    queryFn: async () => {
      const { userId } = await getCurrentUser();
      const { data } = await client.models.UserFollowedAuthor.list({
        filter: { userId: { eq: userId } },
      });
      return data?.length ?? 0;
    },
    staleTime: 1000 * 60,
  });
}

// ── Follow an author ──────────────────────────────────────────────────────
export function useFollowAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (authorId: string) => {
      const { userId } = await getCurrentUser();
      return client.models.UserFollowedAuthor.create({
        userId,
        authorId,
        followedAt: new Date().toISOString(),
      });
    },
    onSuccess: (_, authorId) => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', authorId] });
      queryClient.invalidateQueries({ queryKey: ['followingCount'] });
      queryClient.invalidateQueries({ queryKey: ['followedAuthors'] });
    },
  });
}

// ── Unfollow an author ────────────────────────────────────────────────────
export function useUnfollowAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, authorId }: { recordId: string; authorId: string }) => {
      return client.models.UserFollowedAuthor.delete({ id: recordId });
    },
    onSuccess: (_, { authorId }) => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', authorId] });
      queryClient.invalidateQueries({ queryKey: ['followingCount'] });
      queryClient.invalidateQueries({ queryKey: ['followedAuthors'] });
    },
  });
}

// ── Paginated list of followed authors (most recent first) ────────────────
export function useFollowedAuthors() {
  return useInfiniteQuery({
    queryKey: ['followedAuthors'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const { userId } = await getCurrentUser();

      const { data, nextToken } = await (
        client.models.UserFollowedAuthor as any
      ).listUserFollowedAuthorByUserIdAndFollowedAt(
        { userId },
        {
          sortDirection: 'DESC',
          limit: PAGE_SIZE,
          nextToken: pageParam,
        }
      );

      if (!data?.length) return { items: [], nextToken: null };

      const authorResults = await Promise.all(
        data.map((r: any) => client.models.Author.get({ id: r.authorId }))
      );

      return {
        items: data.map((record: any, i: number) => ({
          followRecord: record,
          author: authorResults[i]?.data ?? null,
        })).filter((item: any) => item.author !== null),
        nextToken: nextToken ?? null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    staleTime: 1000 * 60,
  });
}