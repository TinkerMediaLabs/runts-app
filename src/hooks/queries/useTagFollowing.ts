import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import { useIsGuest } from '../../lib/dataAccess';
import type { Schema } from '../../../amplify/data/resource';
import { Analytics } from '@/lib/analytics';
import { unwrap } from '@/lib/amplifyResult';
import { showChip } from '@/lib/chip';
import { useApp } from '@/context/AppContext';
import { fetchTag } from './useTagNames';

// Following a genre (any tag). One row per person and tag in UserFollowedTag. Same shape as following an author
// (useAuthorFollowing.ts): a check by (user, tag), follow and unfollow with an instant update, and a paged list.
// `notify` is the new-story push for that tag; a row without it counts as ON.

const PAGE_SIZE = 30;

export type TagFollowState = { isFollowing: boolean; recordId: string | null; notify: boolean };

// ── Is this tag followed? ─────────────────────────────────────────────────
export function useIsFollowingTag(tagId: string) {
  const guest = useIsGuest();
  return useQuery<TagFollowState>({
    queryKey: ['isFollowingTag', tagId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const { data } = await (client.models.UserFollowedTag as any).listUserFollowedTagByUserIdAndTagId(
        { userId, tagId: { eq: tagId } },
        { limit: 10 },
      );
      const row = data?.[0];
      return { isFollowing: !!row, recordId: row?.id ?? null, notify: row?.notify !== false };
    },
    enabled: !!tagId && !guest,
    staleTime: 1000 * 30,
  });
}

// ── Follow a tag ──────────────────────────────────────────────────────────
export function useFollowTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId }: { tagId: string; name?: string }) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      return unwrap(await client.models.UserFollowedTag.create({
        userId,
        tagId,
        followedAt: new Date().toISOString(),
        notify: true,
      }), 'Follow genre');
    },
    onMutate: async ({ tagId }) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowingTag', tagId] });
      const previous = queryClient.getQueryData<TagFollowState>(['isFollowingTag', tagId]);
      queryClient.setQueryData<TagFollowState>(['isFollowingTag', tagId], {
        isFollowing: true, recordId: previous?.recordId ?? null, notify: true,
      });
      return { previous };
    },
    onError: (_err, { tagId }, context) => {
      if (context?.previous) queryClient.setQueryData(['isFollowingTag', tagId], context.previous);
      showChip("Couldn't follow this genre. Please try again.", 'error');
    },
    onSuccess: (_, { tagId, name }) => {
      Analytics.tagFollowed(tagId, name);
      showChip(name ? `Following ${name}` : 'Genre followed');
    },
    onSettled: (_data, _err, { tagId }) => {
      queryClient.invalidateQueries({ queryKey: ['isFollowingTag', tagId] });
      queryClient.invalidateQueries({ queryKey: ['followedTags'] });
      queryClient.invalidateQueries({ queryKey: ['followedTagIds'] });
    },
  });
}

// ── Unfollow a tag ────────────────────────────────────────────────────────
export function useUnfollowTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId }: { recordId: string; tagId: string; name?: string }) => {
      const client = generateClient<Schema>();
      return unwrap(await client.models.UserFollowedTag.delete({ id: recordId }), 'Unfollow genre');
    },
    onMutate: async ({ tagId }) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowingTag', tagId] });
      const previous = queryClient.getQueryData<TagFollowState>(['isFollowingTag', tagId]);
      queryClient.setQueryData<TagFollowState>(['isFollowingTag', tagId], { isFollowing: false, recordId: null, notify: true });
      return { previous };
    },
    onError: (_err, { tagId }, context) => {
      if (context?.previous) queryClient.setQueryData(['isFollowingTag', tagId], context.previous);
      showChip("Couldn't unfollow this genre. Please try again.", 'error');
    },
    onSuccess: (_, { tagId, name }) => {
      Analytics.tagUnfollowed(tagId, name);
      showChip(name ? `Unfollowed ${name}` : 'Genre unfollowed');
    },
    onSettled: (_data, _err, { tagId }) => {
      queryClient.invalidateQueries({ queryKey: ['isFollowingTag', tagId] });
      queryClient.invalidateQueries({ queryKey: ['followedTags'] });
      queryClient.invalidateQueries({ queryKey: ['followedTagIds'] });
    },
  });
}

// ── Turn the new-story push for one followed tag on or off ────────────────
// Updates only that tag's cached follow state (the My Tags and settings rows read it), so a toggle never refetches a list.
export function useSetTagNotify() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, notify }: { recordId: string; tagId: string; notify: boolean }) => {
      const client = generateClient<Schema>();
      return unwrap(await client.models.UserFollowedTag.update({ id: recordId, notify }), 'Genre notifications');
    },
    onMutate: async ({ tagId, notify }) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowingTag', tagId] });
      const previous = queryClient.getQueryData<TagFollowState>(['isFollowingTag', tagId]);
      if (previous) queryClient.setQueryData<TagFollowState>(['isFollowingTag', tagId], { ...previous, notify });
      return { previous };
    },
    onError: (_err, { tagId }, context) => {
      if (context?.previous) queryClient.setQueryData(['isFollowingTag', tagId], context.previous);
      showChip("Couldn't change that setting. Please try again.", 'error');
    },
  });
}

// ── The followed tags, newest follow first (My Tags, notification settings) ──
// Same pattern as the pinned list, so cost follows what is on screen and never the number of follows:
//  - one index query per page of 30 (newest follow first), never a scan;
//  - the tags for that page come from the shared ['tag', id] cache, and only the ones not cached yet are fetched;
//  - each row's follow state is put in the ['isFollowingTag', id] cache, so a tile needs no request of its own;
//  - erotic genres are left out unless the person turned erotic content on.
// The Home row and For You do NOT read this whole list: they use only the newest few follows (see FOLLOWED_TAGS_FOR_FEEDS).
export function useFollowedTags() {
  const guest = useIsGuest();
  const { eroticEnabled } = useApp();
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    enabled: !guest,
    queryKey: ['followedTags', eroticEnabled],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const res: any = await (client.models.UserFollowedTag as any).listUserFollowedTagByUserIdAndFollowedAt(
        { userId },
        { sortDirection: 'DESC', limit: PAGE_SIZE, nextToken: pageParam },
      );
      if (res.errors?.length) throw new Error(res.errors[0].message);
      const rows: any[] = res.data ?? [];

      const tags = await Promise.all(rows.map((r: any) =>
        queryClient.ensureQueryData({ queryKey: ['tag', r.tagId], queryFn: () => fetchTag(r.tagId), staleTime: 1000 * 60 * 30 })
      ));
      rows.forEach((r: any) => {
        queryClient.setQueryData(['isFollowingTag', r.tagId], { isFollowing: true, recordId: r.id, notify: r.notify !== false });
      });

      const items = rows
        .map((followRecord: any, i: number) => ({ followRecord, tag: tags[i] as any }))
        .filter(item => !!item.tag?.name && (eroticEnabled || !item.tag?.isErotic));
      return { items, nextToken: (res.nextToken ?? null) as string | null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    staleTime: 1000 * 60,
  });
}

// How many of the newest follows the Home row and For You use (the row shows about a dozen stories, so 6 genres are plenty). A fixed small number keeps their cost the same
// whether someone follows 3 genres or 3,000 (one indexed story query per followed genre).
export const FOLLOWED_TAGS_FOR_FEEDS = 6;
