import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const client = generateClient<Schema>();

// ── Fetch comments for a story, sorted oldest first ───────────────────────
export function useComments(storyId: string) {
  return useQuery({
    queryKey: ['comments', storyId],
    queryFn: async () => {
      const { data } = await client.models.Comment.list({
        filter: { storyId: { eq: storyId } },
      });
      return (data ?? []).sort((a, b) =>
        new Date(a.createdAt ?? '').getTime() - new Date(b.createdAt ?? '').getTime()
      );
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
      return client.models.Comment.delete({ id });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId] });
    },
  });
}