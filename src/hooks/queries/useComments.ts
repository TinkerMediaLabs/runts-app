import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';



// ── Fetch comments for a story, sorted oldest first ───────────────────────
export function useComments(storyId: string) {
  return useQuery({
    queryKey: ['comments', storyId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      // INTERIM: all pages (no silent 100-row cap). Needs a load-more UI before stories reach 1000s of comments.
      return fetchAllPages<any>(token =>
          (client.models.Comment as any).listCommentByStoryIdAndCreatedAt(
              { storyId }, { sortDirection: 'ASC', limit: 100, nextToken: token }));
          },
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
      return client.models.Comment.create({ userId, storyId, content, userName });
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
      return client.models.Comment.update({ id, content });
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
      return client.models.Comment.delete({ id });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId] });
    },
  });
}