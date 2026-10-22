import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';
import { Analytics } from '@/lib/analytics';
import { unwrap } from '@/lib/amplifyResult';
import { showChip } from '@/lib/chip';


const PAGE_SIZE = 20;

// ── Check if following a specific author ──────────────────────────────────
export function useIsFollowing(authorId: string) {
  return useQuery({
    queryKey: ['isFollowing', authorId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      // (userId, authorId) lookup on the index; sort-key condition must be a predicate object.
      const { data } = await (client.models.UserFollowedAuthor as any).listUserFollowedAuthorByUserIdAndAuthorId(
          { userId, authorId: { eq: authorId } },
          { limit: 10 }
      );
      return { isFollowing: !!data?.length, recordId: data?.[0]?.id ?? null };
    },
    enabled: !!authorId,
    staleTime: 1000 * 30,
  });
}

// ── Following count (profile stat) ────────────────────────────────────────
// Reads the aggregate User.followedAuthorCount (kept by follow-count-aggregator) - one get,
// no matter how many authors the user follows.
export function useFollowingCount() {
  return useQuery({
    queryKey: ['followingCount'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const { data } = await client.models.User.get({ id: userId });
      return (data as any)?.followedAuthorCount ?? 0;
    },
    staleTime: 0,
  });
}

// ── Follow an author ──────────────────────────────────────────────────────
export function useFollowAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (authorId: string) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      return unwrap(await client.models.UserFollowedAuthor.create({
        userId,
        authorId,
        followedAt: new Date().toISOString(),
      }), 'Follow');
    },
    onMutate: async (authorId: string) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowing', authorId] });
      const previous = queryClient.getQueryData<{ isFollowing: boolean; recordId: string | null }>(['isFollowing', authorId]);

      queryClient.setQueryData(['isFollowing', authorId], {
        isFollowing: true,
        recordId: previous?.recordId ?? null,
      });

      return { previous };
    },
    onError: (_err, authorId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['isFollowing', authorId], context.previous);
      }
      showChip("Couldn't follow author. Please try again.", 'error');
    },
    onSuccess: (_, authorId) => {
      Analytics.authorFollowed(authorId);
      const cached = queryClient.getQueryData<{ name?: string }>(['authorName', authorId]);
      showChip(cached?.name ? `Now following ${cached.name}` : 'Author followed');
    },
    onSettled: (_data, _err, authorId) => {
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
    mutationFn: async ({ recordId }: { recordId: string; authorId: string }) => {
      const client = generateClient<Schema>();
      return unwrap(await client.models.UserFollowedAuthor.delete({ id: recordId }), 'Unfollow');
    },
    onMutate: async ({ authorId }: { recordId: string; authorId: string }) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowing', authorId] });
      const previous = queryClient.getQueryData(['isFollowing', authorId]);

      queryClient.setQueryData(['isFollowing', authorId], {
        isFollowing: false,
        recordId: null,
      });

      return { previous };
    },
    onError: (_err, { authorId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['isFollowing', authorId], context.previous);
      }
      showChip("Couldn't unfollow author. Please try again.", 'error');
    },
    onSuccess: (_, { authorId }) => {
      Analytics.authorUnfollowed(authorId);
      showChip('Author unfollowed');
    },
    onSettled: (_data, _err, { authorId }) => {
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
      const client = generateClient<Schema>();
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