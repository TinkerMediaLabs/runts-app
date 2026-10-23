import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { findFinished } from '../../lib/userStoryLookups';
import { useTagNames } from './useTagNames';
import { useAuthorNames } from './useAuthorNames';
import { isRecentlyPublished } from '../../lib/storyDisplay';

// SCALE NOTE: recommendations never scan the catalog. Each call makes at most four small indexed
// queries (universe, primary tag by popularity, secondary tag by popularity, author), merges them in
// memory, then checks "already finished" for the top few candidates with the byUserAndStory index.
// Cost per story page is constant no matter how many stories exist.

const UNIVERSE_LIMIT = 50;
const TAG_LIMIT = 25;
const SECONDARY_TAG_LIMIT = 15;
const AUTHOR_LIMIT = 15;

export type RecommendationReason = 'next-part' | 'universe' | 'author' | 'tag';

export type Recommendation = {
  story: any;
  score: number;
  reason: RecommendationReason;
};

type Options = {
  eroticEnabled: boolean;
  limit?: number;
};

const REASON_RANK: Record<RecommendationReason, number> = {
  'next-part': 4,
  universe: 3,
  author: 2,
  tag: 1,
};

export async function fetchRecommendations(source: any, { eroticEnabled, limit = 12 }: Options): Promise<Recommendation[]> {
  if (!source?.id) return [];
  const client = generateClient<Schema>();
  const sourceIsErotic = source.isErotic === 'true';
  // Erotic stories only recommend erotic stories (and only when enabled); everything else never sees them.
  const allowErotic = sourceIsErotic && eroticEnabled;
  if (sourceIsErotic && !eroticEnabled) return [];

  const safe = async (p: Promise<any>): Promise<any[]> => {
    try {
      const res = await p;
      return res?.data ?? [];
    } catch {
      return [];
    }
  };

  const [universeRows, tagRows, secondaryRows, authorRows] = await Promise.all([
    source.universeId
      ? safe((client.models.Story as any).listStoryByUniverseIdAndPublishedAt(
          { universeId: source.universeId }, { sortDirection: 'ASC', limit: UNIVERSE_LIMIT }))
      : Promise.resolve([]),
    source.primaryTagId
      ? safe((client.models.Story as any).listStoryByLiveTagIdAndNumListens(
          { liveTagId: source.primaryTagId }, { sortDirection: 'DESC', limit: TAG_LIMIT }))
      : Promise.resolve([]),
    source.secondaryTagId
      ? safe((client.models.Story as any).listStoryByLiveTagIdAndNumListens(
          { liveTagId: source.secondaryTagId }, { sortDirection: 'DESC', limit: SECONDARY_TAG_LIMIT }))
      : Promise.resolve([]),
    source.authorId
      ? safe((client.models.Story as any).listStoryByAuthorIdAndPublishedAt(
          { authorId: source.authorId }, { sortDirection: 'DESC', limit: AUTHOR_LIMIT }))
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, Recommendation>();
  const add = (s: any, score: number, reason: RecommendationReason) => {
    if (!s?.id || s.id === source.id) return;
    if (s.live !== 'true') return;
    const isErotic = s.isErotic === 'true';
    if (isErotic && !allowErotic) return;
    if (!isErotic && allowErotic) return;
    const existing = byId.get(s.id);
    if (!existing) {
      byId.set(s.id, { story: s, score, reason });
      return;
    }
    existing.score += score;
    if (REASON_RANK[reason] > REASON_RANK[existing.reason]) existing.reason = reason;
  };

  const currentSeq = source.sequenceNumber ?? 0;
  universeRows.forEach((s: any) => {
    const seq = s.sequenceNumber ?? 0;
    if (currentSeq && seq === currentSeq + 1) add(s, 100, 'next-part');
    else if (currentSeq && seq > currentSeq) add(s, 60 - Math.min(seq - currentSeq, 20), 'universe');
    else if (!currentSeq) add(s, 40, 'universe');
    else add(s, 15, 'universe');
  });
  authorRows.forEach((s: any, i: number) => add(s, 45 - Math.min(i, 10), 'author'));
  tagRows.forEach((s: any, i: number) => add(s, 30 - Math.min(i, 20) * 0.5, 'tag'));
  secondaryRows.forEach((s: any, i: number) => add(s, 18 - Math.min(i, 10) * 0.5, 'tag'));

  const ranked = Array.from(byId.values()).sort((a, b) => b.score - a.score);
  const pool = ranked.slice(0, limit + 8);

  let userId: string | null = null;
  try { userId = (await getCurrentUser()).userId; } catch { userId = null; }

  if (userId) {
    const finishedFlags = await Promise.all(pool.map(async r => {
      try { return (await findFinished(userId as string, r.story.id)).length > 0; } catch { return false; }
    }));
    return pool.filter((_, i) => !finishedFlags[i]).slice(0, limit);
  }
  return pool.slice(0, limit);
}

// Recommendations for a story, enriched with tag and author names so tiles can render directly.
export function useRecommendations(source: any | null | undefined, eroticEnabled: boolean, limit: number = 12) {
  const query = useQuery({
    queryKey: ['recommendations', source?.id, eroticEnabled, limit],
    queryFn: () => fetchRecommendations(source, { eroticEnabled, limit }),
    enabled: !!source?.id,
    staleTime: 1000 * 60 * 10,
  });

  const stories = useMemo(() => (query.data ?? []).map(r => r.story), [query.data]);
  const tagIds = useMemo(() => stories.flatMap((s: any) => [s.primaryTagId, s.secondaryTagId]), [stories]);
  const { data: tagMap = {} } = useTagNames(tagIds);
  const { data: authorMap = {} } = useAuthorNames(stories.map((s: any) => s.authorId));

  const items = useMemo(() => (query.data ?? []).map(r => ({
    ...r.story,
    reason: r.reason,
    primaryTagName:   (tagMap as any)[r.story.primaryTagId ?? ''] ?? '',
    secondaryTagName: (tagMap as any)[r.story.secondaryTagId ?? ''] ?? '',
    authorName:       (authorMap as any)[r.story.authorId ?? ''] ?? '',
    isNew:            isRecentlyPublished(r.story.publishedAt),
  })), [query.data, tagMap, authorMap]);

  return { items, isLoading: query.isLoading };
}
