import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { getOfflineEnabled } from '../../lib/offlineStorage';
import { downloadStory, deleteDownload } from './useDownloads';
import { useApp } from '@/context/AppContext';
import { Analytics } from '@/lib/analytics';
import { fetchAllPages } from '../../lib/paginate';
import { findPinned } from '../../lib/userStoryLookups';

// All of a user's pins, ordered by sortOrder, fully paginated (index query).
async function fetchAllPins(userId: string): Promise<any[]> {
  const client = generateClient<Schema>();
  return fetchAllPages<any>(token =>
    (client.models.UserPinnedStory as any).listUserPinnedStoryByUserIdAndSortOrder(
      { userId }, { sortDirection: 'ASC', limit: 100, nextToken: token }));
}

// ─── Fetch all pinned stories for current user ────────────────────────────
export function usePinnedStories() {
    const { eroticEnabled, eroticInPlaylist } = useApp();

    return useQuery({
        queryKey: ['pinnedStories', eroticEnabled, eroticInPlaylist],
        queryFn: async () => {
            const client = generateClient<Schema>();
            const { userId } = await getCurrentUser();
            const sorted = await fetchAllPins(userId);

            // Fetch story data to check isErotic — needed for filtering
            const storyResults = await Promise.all(
                sorted.map((r : any) => client.models.Story.get({ id: r.storyId }))
            );

            return sorted.filter((_: any, i: number) => {
                const story = storyResults[i]?.data;
                if (story?.isErotic !== 'true') return true;
                if (!eroticEnabled)    return false;
                if (!eroticInPlaylist) return false;
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
      const pins = await fetchAllPins(userId);
      return new Set(pins.map((p: any) => p.storyId));
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Pin a story ──────────────────────────────────────────────────────────
export function usePinStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();

      // Already pinned? (index lookup, no table read) — makes pin idempotent.
      const already = await findPinned(userId, storyId);
      if (already.length) return already[0];

      // Next sortOrder = (highest existing sortOrder) + 1 — ONE row via DESC index query,
      // not "count the list" (which broke past one page and could collide).
      const { data: top } = await (client.models.UserPinnedStory as any).listUserPinnedStoryByUserIdAndSortOrder(
          { userId }, { sortDirection: 'DESC', limit: 1 });
      const sortOrder = (top?.[0]?.sortOrder ?? -1) + 1;

      // sortOrder MUST always be set: the index is sparse and rows without it are invisible.
      const { data, errors } = await client.models.UserPinnedStory.create({
        userId,
        storyId,
        pinnedAt:  new Date().toISOString(),
        sortOrder,
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    onMutate: async (storyId: string) => {
      await queryClient.cancelQueries({ queryKey: ['pinnedStoryIds'] });
      const previous = queryClient.getQueryData<Set<string>>(['pinnedStoryIds']);

      queryClient.setQueryData<Set<string>>(['pinnedStoryIds'], (old) => {
        const next = new Set(old ?? []);
        next.add(storyId);
        return next;
      });

      return { previous };
    },
    onError: (_err, _storyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pinnedStoryIds'], context.previous);
      }
    },
    onSuccess: (_, storyId) => {
      Analytics.storyPinned({ storyId });

      // Trigger download in background — non-blocking
      getOfflineEnabled().then(enabled => {
        if (!enabled) return;
        const client = generateClient<Schema>();
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
    onSettled: () => {
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
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();

      // Index lookup by (userId, storyId) — no list-everything-then-filter.
      const existing = await findPinned(userId, storyId);
      for (const row of existing) {
        const { errors } = await client.models.UserPinnedStory.delete({ id: row.id });
        if (errors) throw new Error(errors[0].message);
      }
    },
    onMutate: async (storyId: string) => {
      await queryClient.cancelQueries({ queryKey: ['pinnedStoryIds'] });
      const previous = queryClient.getQueryData<Set<string>>(['pinnedStoryIds']);

      queryClient.setQueryData<Set<string>>(['pinnedStoryIds'], (old) => {
        const next = new Set(old ?? []);
        next.delete(storyId);
        return next;
      });

      return { previous };
    },
    onError: (_err, _storyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pinnedStoryIds'], context.previous);
      }
    },
    onSuccess: (_, storyId) => {
      Analytics.storyUnpinned({ storyId });

      deleteDownload(storyId).catch(err =>
        console.warn('Unpin delete download error:', err)
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
    },
  });
}

// ─── Toggle pin ───────────────────────────────────────────────────────────
export function useTogglePin() {
  const pinStory   = usePinStory();
  const unpinStory = useUnpinStory();

  return {
    toggle: (storyId: string, isPinned: boolean) => {
      if (isPinned) {
        unpinStory.mutate(storyId);
      } else {
        pinStory.mutate(storyId);
      }
    },
    isLoading: pinStory.isPending || unpinStory.isPending,
  };
}
