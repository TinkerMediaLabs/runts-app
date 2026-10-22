import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '@/lib/amplifyResult';



// ── Comments for a story: newest first, paged (Load more) ─────────────────
const COMMENTS_PAGE_SIZE = 20;

export function useComments(storyId: string) {
  return useInfiniteQuery({
    queryKey: ['comments', storyId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.Comment as any).listCommentByStoryIdAndCreatedAt(
        { storyId },
        { sortDirection: 'DESC', limit: COMMENTS_PAGE_SIZE, nextToken: pageParam ?? undefined }
      );
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return { items: (res.data ?? []) as any[], nextToken: (res.nextToken ?? null) as string | null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextToken,
    enabled: !!storyId,
    staleTime: 1000 * 60,
  });
}

// ── Post a new comment ────────────────────────────────────────────────────
export function usePostComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storyId,
      content,
      userName,
    }: {
      storyId: string;
      content: string;
      userName: string;
    }) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      return unwrap(await client.models.Comment.create({ userId, storyId, content, userName }), 'Post comment');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId] });
    },
  });
}

// ── Edit an existing comment ──────────────────────────────────────────────
export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      content,
    }: {
      id: string;
      content: string;
      storyId: string;
    }) => {
      const client = generateClient<Schema>();
      return unwrap(await client.models.Comment.update({ id, content }), 'Edit comment');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.storyId] });
    },
  });
}

// ── Delete a comment ──────────────────────────────────────────────────────
export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; storyId: string }) => {
      const client = generateClient<Schema>();
      return unwrap(await client.models.Comment.delete({ id }), 'Delete comment');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId] });
    },
  });
}