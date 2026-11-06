import { generateClient } from 'aws-amplify/data';
import { isCommentAllowed, COMMENT_REJECTED_MESSAGE } from '../../lib/commentFilter';
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
// Goes through the postComment mutation (functions/comment-write): the server takes the author from the
// sign-in and re-checks length, the word filter and the posting rate.
export function usePostComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storyId,
      content,
      anonymous,
    }: {
      storyId: string;
      content: string;
      anonymous?: boolean;
    }) => {
      if (!isCommentAllowed(content)) throw new Error(COMMENT_REJECTED_MESSAGE);
      const client = generateClient<Schema>();
      return unwrap(await client.mutations.postComment({ storyId, content, anonymous: !!anonymous }), 'Post comment');
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
      if (!isCommentAllowed(content)) throw new Error(COMMENT_REJECTED_MESSAGE);
      const client = generateClient<Schema>();
      return unwrap(await client.mutations.editComment({ id, content }), 'Edit comment');
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