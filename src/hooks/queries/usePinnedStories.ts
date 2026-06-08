import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { getOfflineEnabled } from '../../lib/offlineStorage';
import { downloadStory, deleteDownload } from './useDownloads';
import { useApp } from '@/context/AppContext';
import { Analytics } from '@/lib/analytics';

const client = generateClient<Schema>();

// ─── Fetch all pinned stories for current user ────────────────────────────
export function usePinnedStories() {
    const { eroticEnabled, eroticInPlaylist } = useApp();

    return useQuery({
        queryKey: ['pinnedStories', eroticEnabled, eroticInPlaylist],
        queryFn: async () => {
            const { userId } = await getCurrentUser();
            const { data, errors } = await client.models.UserPinnedStory.list({
                filter: { userId: { eq: userId } },
            });
            if (errors) throw new Error(errors[0].message);

            const sorted = [...(data ?? [])].sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            );

            // Fetch story data to check isErotic — needed for filtering
            const storyResults = await Promise.all(
                sorted.map(r => client.models.Story.get({ id: r.storyId }))
            );

            // Show erotic pinned stories only when both eroticEnabled AND eroticInPlaylist
            return sorted.filter((_, i) => {
                const story = storyResults[i]?.data;
                if (story?.isErotic !== 'true') return true;  // non-erotic always shown
                if (!eroticEnabled)    return false;           // erotic disabled
                if (!eroticInPlaylist) return false;           // erotic excluded from playlist
                return true;
            });
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

      const { data: existing } = await client.models.UserPinnedStory.list({
        filter: { userId: { eq: userId } },
      });
      const sortOrder = (existing ?? []).length;

      const { data, errors } = await client.models.UserPinnedStory.create({
        userId,
        storyId,
        pinnedAt:  new Date().toISOString(),
        sortOrder,
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    onSuccess: (_, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
      Analytics.storyPinned({ storyId });

      // Trigger download in background — non-blocking
      getOfflineEnabled().then(enabled => {
        if (!enabled) return;
        client.models.Story.get({ id: storyId }).then(({ data: story }) => {
          if (story?.audioUri) {
            downloadStory({
              id:       story.id,
              audioUri: story.audioUri,
              title:    story.title,
            }).catch(err => console.warn('Pin download error:', err));
          }
        });
      });
    },
  });
}

// ─── Unpin a story ────────────────────────────────────────────────────────
export function useUnpinStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const { userId } = await getCurrentUser();

      const { data: existing } = await client.models.UserPinnedStory.list({
        filter: {
          and: [
            { userId:  { eq: userId  } },
            { storyId: { eq: storyId } },
          ],
        },
      });

      if (!existing?.length) return;

      const { errors } = await client.models.UserPinnedStory.delete({
        id: existing[0].id,
      });
      if (errors) throw new Error(errors[0].message);
    },
    onSuccess: (_, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
      Analytics.storyUnpinned({ storyId });

      // Delete local download in background — non-blocking
      deleteDownload(storyId).catch(err =>
        console.warn('Unpin delete download error:', err)
      );
    },
  });
}

// ─── Toggle pin ───────────────────────────────────────────────────────────
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