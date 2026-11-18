import { useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import { useIsGuest } from '../../lib/dataAccess';
import { useApp } from '@/context/AppContext';
import { mixRoundRobin } from '../../lib/mixStories';
import { fetchTag } from './useTagNames';
import { FOLLOWED_TAGS_FOR_FEEDS } from './useTagFollowing';
import type { Schema } from '../../../amplify/data/resource';

// What the genres a listener follows feed into: the "New in genres you follow" Home row and the For You mix.
// Both look only at the newest FOLLOWED_TAGS_FOR_FEEDS follows, so the cost is one small indexed read for the
// follows plus one small indexed story query per genre, whether someone follows 3 genres or 3,000.

const NEW_PER_TAG = 4;   // the row shows about a dozen stories mixed from up to 6 genres, so a few per genre is enough

export type FollowedTag = { id: string; name: string };

// The newest follows (ids and names), without erotic genres unless the listener turned them on. Tags come from
// the shared ['tag', id] cache, so a genre already seen elsewhere costs nothing.
export function useFollowedTagIds() {
  const guest = useIsGuest();
  const { eroticEnabled } = useApp();
  const queryClient = useQueryClient();
  return useQuery<FollowedTag[]>({
    enabled: !guest,
    queryKey: ['followedTagIds', eroticEnabled],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const res: any = await (client.models.UserFollowedTag as any).listUserFollowedTagByUserIdAndFollowedAt(
        { userId },
        { sortDirection: 'DESC', limit: FOLLOWED_TAGS_FOR_FEEDS },
      );
      if (res.errors?.length) throw new Error(res.errors[0].message);
      const rows: any[] = res.data ?? [];
      const tags = await Promise.all(rows.map((r: any) =>
        queryClient.ensureQueryData({ queryKey: ['tag', r.tagId], queryFn: () => fetchTag(r.tagId), staleTime: 1000 * 60 * 30 })
      ));
      return tags
        .filter((t: any) => !!t?.name && (eroticEnabled || !t?.isErotic))
        .map((t: any) => ({ id: t.id, name: t.name }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

// The newest live stories across the followed genres, mixed round-robin so no one genre crowds out the rest.
export function useNewInFollowedGenres(limit: number = 12) {
  const { data: tags, isLoading: tagsLoading } = useFollowedTagIds();
  const ids = (tags ?? []).map(t => t.id);
  const query = useQuery({
    enabled: ids.length > 0,
    queryKey: ['stories', 'newInFollowed', ids.join(','), limit],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const lists = await Promise.all(ids.map(async (liveTagId) => {
        try {
          const res: any = await (client.models.Story as any).listStoryByLiveTagIdAndPublishedAt(
            { liveTagId }, { sortDirection: 'DESC', limit: NEW_PER_TAG });
          return (res?.data ?? []) as any[];
        } catch { return [] as any[]; }
      }));
      return mixRoundRobin(lists, limit);
    },
    staleTime: 1000 * 60 * 5,
  });
  return { stories: query.data ?? [], isLoading: tagsLoading || (ids.length > 0 && query.isLoading), hasFollows: ids.length > 0 };
}
