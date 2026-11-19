import { useEffect, useRef } from 'react';
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
import { hasNewStories } from '../../lib/newStories';

// Following a genre (any tag). One row per person and tag in UserFollowedTag. Same shape as following an author
// (useAuthorFollowing.ts): a check by (user, tag), follow and unfollow with an instant update, and a paged list.
// `notify` is the new-story push for that tag; a row without it counts as ON.

const PAGE_SIZE = 30;

export type TagFollowState = { isFollowing: boolean; recordId: string | null; notify: boolean; lastSeenAt?: string | null; followedAt?: string | null };

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
      return { isFollowing: !!row, recordId: row?.id ?? null, notify: row?.notify !== false, lastSeenAt: row?.lastSeenAt ?? null, followedAt: row?.followedAt ?? null };
    },
    enabled: !!tagId && !guest,
    staleTime: 1000 * 30,
  });
}

// ── Which tags does this person follow? One set for the whole app ─────────────
// Tiles use it to show a "Following" badge. One small query for the person (only the tag ids, 200 per page, up to
// 1,000 follows), cached for five minutes, instead of one request per tile on screen. Follow and unfollow update it
// at once.
export function useFollowedTagSet() {
  const guest = useIsGuest();
  return useQuery<Set<string>>({
    enabled: !guest,
    queryKey: ['followedTagSet'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const ids = new Set<string>();
      let nextToken: string | undefined;
      for (let page = 0; page < 5; page++) {
        const res: any = await (client.models.UserFollowedTag as any).listUserFollowedTagByUserIdAndFollowedAt(
          { userId },
          { limit: 200, nextToken, selectionSet: ['tagId'] },
        );
        if (res.errors?.length) throw new Error(res.errors[0].message);
        (res.data ?? []).forEach((r: any) => ids.add(r.tagId));
        nextToken = res.nextToken ?? undefined;
        if (!nextToken) break;
      }
      return ids;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useIsTagFollowed(tagId?: string | null): boolean {
  const { data } = useFollowedTagSet();
  return !!tagId && !!data?.has(tagId);
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
      queryClient.setQueryData<Set<string>>(['followedTagSet'], old => (old ? new Set(old).add(tagId) : old));
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
      queryClient.invalidateQueries({ queryKey: ['followedTagSet'] });
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
      queryClient.setQueryData<Set<string>>(['followedTagSet'], old => { if (!old) return old; const next = new Set(old); next.delete(tagId); return next; });
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
      queryClient.invalidateQueries({ queryKey: ['followedTagSet'] });
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
        queryClient.setQueryData(['isFollowingTag', r.tagId], { isFollowing: true, recordId: r.id, notify: r.notify !== false, lastSeenAt: r.lastSeenAt ?? null, followedAt: r.followedAt ?? null });
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

// ── The person opened a followed tag: clear its "new stories" dot ─────────
// Writes lastSeenAt on the follow record, but only when the tag actually has something new, so a visit to a tag with
// nothing new costs no write. The follow state and the My Tags list are updated in place, so the dot is gone at once
// with no refetch. Best effort: if the write fails the dot simply shows again next time.
export function useMarkTagSeen(tagId: string, latestStoryAt?: string | null) {
  const { data: follow } = useIsFollowingTag(tagId);
  const queryClient = useQueryClient();
  const sentFor = useRef<string | null>(null);
  useEffect(() => {
    if (!follow?.isFollowing || !follow.recordId || !latestStoryAt) return;
    if (!hasNewStories(latestStoryAt, follow.lastSeenAt, follow.followedAt)) return;
    if (sentFor.current === follow.recordId) return;
    sentFor.current = follow.recordId;
    const now = new Date().toISOString();
    queryClient.setQueryData<TagFollowState>(['isFollowingTag', tagId], old => (old ? { ...old, lastSeenAt: now } : old));
    queryClient.setQueriesData<any>({ queryKey: ['followedTags'] }, (old: any) => old && ({
      ...old,
      pages: old.pages.map((p: any) => ({
        ...p,
        items: p.items.map((it: any) => it.tag?.id === tagId ? { ...it, followRecord: { ...it.followRecord, lastSeenAt: now } } : it),
      })),
    }));
    const client = generateClient<Schema>();
    client.models.UserFollowedTag.update({ id: follow.recordId, lastSeenAt: now }).catch(() => {});
  }, [follow, latestStoryAt, tagId, queryClient]);
}

// How many of the newest follows the Home row and For You use (the row shows about a dozen stories, so 6 genres are plenty). A fixed small number keeps their cost the same
// whether someone follows 3 genres or 3,000 (one indexed story query per followed genre).
export const FOLLOWED_TAGS_FOR_FEEDS = 6;
