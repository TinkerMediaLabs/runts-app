import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient<Schema>();

// ─── Fetch all pinned stories for current user ────────────────────────────
export function usePinnedStories() {
  return useQuery({
    queryKey: ['pinnedStories'],
    queryFn: async () => {
      const { userId } = await getCurrentUser();
      const { data, errors } = await client.models.UserPinnedStory.list({
        filter: { userId: { eq: userId } },
      });
      if (errors) throw new Error(errors[0].message);
      // Sort by sortOrder ascending
      return [...(data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Fetch just the pinned story IDs for fast lookup ─────────────────────
export function usePinnedStoryIds() {
  return useQuery({
    queryKey: ['pinnedStoryIds'],
    queryFn: async () => {
      const { userId } = await getCurrentUser();
      const { data, errors } = await client.models.UserPinnedStory.list({
        filter: { userId: { eq: userId } },
      });
      if (errors) throw new Error(errors[0].message);
      return new Set((data ?? []).map(p => p.storyId));
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Pin a story ──────────────────────────────────────────────────────────
export function usePinStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const { userId } = await getCurrentUser();

      // Get current pinned count for sort order
      const { data: existing } = await client.models.UserPinnedStory.list({
        filter: { userId: { eq: userId } },
      });
      const sortOrder = (existing ?? []).length;

      const { data, errors } = await client.models.UserPinnedStory.create({
        userId,
        storyId,
        pinnedAt: new Date().toISOString(),
        sortOrder,
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
    },
  });
}

// ─── Unpin a story ────────────────────────────────────────────────────────
export function useUnpinStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const { userId } = await getCurrentUser();

      // Find the pinned record
      const { data: existing } = await client.models.UserPinnedStory.list({
        filter: {
          and: [
            { userId: { eq: userId } },
            { storyId: { eq: storyId } },
          ],
        },
      });

      if (!existing?.length) return;

      const record = existing[0];
      const { errors } = await client.models.UserPinnedStory.delete({
        id: record.id,
      });
      if (errors) throw new Error(errors[0].message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
    },
  });
}

// ─── Toggle pin (pin if not pinned, unpin if pinned) ──────────────────────
export function useTogglePin() {
  const pinStory   = usePinStory();
  const unpinStory = useUnpinStory();

  return {
    toggle: async (storyId: string, isPinned: boolean) => {
      if (isPinned) {
        await unpinStory.mutateAsync(storyId);
      } else {
        await pinStory.mutateAsync(storyId);
      }
    },
    isLoading: pinStory.isPending || unpinStory.isPending,
  };
}