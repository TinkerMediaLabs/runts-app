import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { useIsGuest } from '../../lib/dataAccess';
import { askForAccount } from '../../lib/requireAccount';
import { getOfflineEnabled } from '../../lib/offlineStorage';
import { downloadStory, deleteDownload } from './useDownloads';
import { useApp } from '@/context/AppContext';
import { Analytics } from '@/lib/analytics';
import { showChip } from '@/lib/chip';
import { findPinned } from '../../lib/userStoryLookups';

const PINS_PAGE_SIZE = 30;

// Pinned stories, ordered by sortOrder, 30 per page (index query) + a Story get for just that
// page to apply the erotic filters. The list screen loads more on scroll.
export function usePinnedStories() {
    const { eroticEnabled, eroticInPlaylist } = useApp();
    const guest = useIsGuest();
    const queryClient = useQueryClient();

    return useInfiniteQuery({
        enabled: !guest,
        queryKey: ['pinnedStories', eroticEnabled, eroticInPlaylist],
        queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const client = generateClient<Schema>();
            const { userId } = await getCurrentUser();
            const res: any = await (client.models.UserPinnedStory as any).listUserPinnedStoryByUserIdAndSortOrder(
                { userId }, { sortDirection: 'ASC', limit: PINS_PAGE_SIZE, nextToken: pageParam ?? undefined });
            if (res.errors?.length) throw new Error(res.errors[0].message);
            const rows: any[] = res.data ?? [];

            const storyResults = await Promise.all(
                rows.map((r: any) => client.models.Story.get({ id: r.storyId }))
            );
            // Each tile reads its story from the ['story', id] cache. Filling it here means a tile has its story the
            // moment it is drawn (no blank row that grows later, no second request for the same story).
            storyResults.forEach((r: any, i: number) => {
                if (r?.data) queryClient.setQueryData(['story', rows[i].storyId], r.data);
            });
            rows.forEach((r: any) => queryClient.setQueryData(['isPinned', r.storyId], true));
            const items = rows.filter((_: any, i: number) => {
                const story = storyResults[i]?.data;
                if (story?.isErotic !== 'true') return true;
                if (!eroticEnabled)    return false;
                if (!eroticInPlaylist) return false;
                return true;
            });
            return { items, nextToken: (res.nextToken ?? null) as string | null };
        },
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextToken,
        staleTime: 1000 * 60 * 5,
    });
}

// ─── Is THIS story pinned? One index lookup, cached per story ─────────────
export function useIsPinned(storyId: string) {
  const guest = useIsGuest();
  return useQuery({
    queryKey: ['isPinned', storyId],
    queryFn: async () => {
      const { userId } = await getCurrentUser();
      return (await findPinned(userId, storyId)).length > 0;
    },
    enabled: !!storyId && !guest,
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
      await queryClient.cancelQueries({ queryKey: ['isPinned', storyId] });
      const previous = queryClient.getQueryData<boolean>(['isPinned', storyId]);
      queryClient.setQueryData<boolean>(['isPinned', storyId], true);
      return { previous };
    },
    onError: (_err, storyId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['isPinned', storyId], context.previous);
      }
      showChip("Couldn't pin story. Please try again.", 'error');
    },
    onSuccess: (_, storyId) => {
      Analytics.storyPinned({ storyId });
      showChip('Story pinned to playlist');

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
              imageUri: story.imageUri,
            }).catch(err => console.warn('Pin download error:', err));
          }
        });
      });
    },
    onSettled: (_d, _e, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['isPinned', storyId] });
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
      await queryClient.cancelQueries({ queryKey: ['isPinned', storyId] });
      const previous = queryClient.getQueryData<boolean>(['isPinned', storyId]);
      queryClient.setQueryData<boolean>(['isPinned', storyId], false);
      return { previous };
    },
    onError: (_err, storyId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['isPinned', storyId], context.previous);
      }
      showChip("Couldn't remove story. Please try again.", 'error');
    },
    onSuccess: (_, storyId) => {
      Analytics.storyUnpinned({ storyId });
      showChip('Story removed from playlist');

      deleteDownload(storyId).catch(err =>
        console.warn('Unpin delete download error:', err)
      );
    },
    onSettled: (_d, _e, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['isPinned', storyId] });
    },
  });
}

// ─── Toggle pin ───────────────────────────────────────────────────────────
export function useTogglePin() {
  const pinStory   = usePinStory();
  const unpinStory = useUnpinStory();
  const guest = useIsGuest();

  return {
    toggle: (storyId: string, isPinned: boolean) => {
      // Guests have no playlist: ask them to make an account instead of failing after the icon changes.
      if (guest) { askForAccount('pin stories to your playlist', { kind: 'pin', id: storyId }); return; }
      if (isPinned) {
        unpinStory.mutate(storyId);
      } else {
        pinStory.mutate(storyId);
      }
    },
    isLoading: pinStory.isPending || unpinStory.isPending,
  };
}
