import { useMemo } from 'react';
import { useQuery, useQueries, useInfiniteQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import type { HomeSectionRow } from '../../lib/homeLayout';
import { resolveDiscoverLayout } from '../../lib/discoverLayout';
import { pickPopular, interleaveRelated, pickTryNew, type ListedTag } from '../../lib/discoverTags';
import { fetchTagInsight, useTagsByIds } from './useTagHome';

// ---- the sections the CMS has set up for Discover ---------------------------------------------------------------

export function useDiscoverLayout() {
  const q = useQuery({
    queryKey: ['discoverLayout'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.HomeSection as any).listHomeSectionByLayoutPkAndSortOrder(
        { layoutPk: 'DISCOVER' }, { limit: 50 });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return (res.data ?? []) as HomeSectionRow[];
    },
    staleTime: 1000 * 60 * 5,
  });
  const sections = useMemo(() => resolveDiscoverLayout(q.data, Date.now()), [q.data]);
  return { sections, isLoading: q.isLoading };
}

// ---- subgenre lists (the TagInsight rows of subgenres that have live stories) ------------------------------------

const toListed = (r: any): ListedTag => ({
  id: r.id, name: r.name ?? '', liveCount: r.liveCount ?? 0, listens7: r.listens7 ?? null, listens7At: r.listens7At ?? null,
});

async function listIndex(method: string, key: Record<string, any>, opts: Record<string, any>) {
  const client = generateClient<Schema>();
  const res: any = await ((client.models as any).TagInsight as any)[method]({ listFlag: 'REGULAR', ...key }, opts);
  if (res.errors?.length) throw new Error(res.errors[0].message);
  return { items: ((res.data ?? []) as any[]).map(toListed).filter(t => !!t.name.trim()), nextToken: (res.nextToken ?? null) as string | null };
}

// Popular right now: ranked by plays in the last week, filled up by the subgenres with the most stories.
export function usePopularSubgenres(enabled: boolean = true) {
  return useQuery({
    queryKey: ['discover', 'popular'],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        listIndex('listTagInsightByListFlagAndListens7', {}, { sortDirection: 'DESC', limit: 40 }),
        listIndex('listTagInsightByListFlagAndLiveCount', {}, { sortDirection: 'DESC', limit: 40 }),
      ]);
      return pickPopular(a.items, b.items, Date.now(), 40);
    },
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

// Pool for the shuffle: starts the alphabetical list at a random letter (picked once per visit), wrapping to
// the start if the tail is short. Only subgenres with live stories are in it.
export function useExplorePool(enabled: boolean = true) {
  const letter = useMemo(() => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)], []);
  return useQuery({
    queryKey: ['discover', 'explore', letter],
    queryFn: async () => {
      let pool = (await listIndex('listTagInsightByListFlagAndNameLower', { nameLower: { ge: letter } }, { limit: 100 })).items;
      if (pool.length < 12) {
        const head = (await listIndex('listTagInsightByListFlagAndNameLower', {}, { limit: 100 })).items;
        const seen = new Set(pool.map(t => t.id));
        pool = pool.concat(head.filter(t => !seen.has(t.id)));
      }
      return pool.slice(0, 60);
    },
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

// The A-Z list: pages of subgenres in alphabetical order.
export function useSubgenreIndex() {
  return useInfiniteQuery({
    queryKey: ['discover', 'index'],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      listIndex('listTagInsightByListFlagAndNameLower', {}, { limit: 80, nextToken: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextToken,
    staleTime: 1000 * 60 * 30,
  });
}

// ---- featured (hand-picked) and personal rows ---------------------------------------------------------------------

// Tags the editor chose, in their order. Genres that currently have no live stories are left out so a tap never
// opens an empty screen.
export function useFeaturedTags(tagIds: string[]) {
  const tags = useTagsByIds(tagIds);
  const insights = useQueries({
    queries: tagIds.map(id => ({
      queryKey: ['tagInsight', id], queryFn: () => fetchTagInsight(id), staleTime: 1000 * 60 * 15, enabled: !!id,
    })),
  });
  const loading = insights.some(q => q.isLoading);
  const list = useMemo(() => {
    const byId = new Map(tags.map((t: any) => [t.id, t]));
    return tagIds.map((id, i) => {
      const t: any = byId.get(id);
      const count = insights[i]?.data?.liveCount;
      return t && !t.isErotic && count !== 0 ? ({ id, name: t.name, liveCount: count ?? 0 } as ListedTag) : null;
    }).filter(Boolean) as ListedTag[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, tagIds.join(','), insights.map(q => q.dataUpdatedAt).join(',')]);
  return { tags: list, isLoading: loading };
}

// "Because you listen to ...": subgenres related to the listener's genres (picked, then learned from listening).
export function useBecauseSubgenres(ownIds: string[], enabled: boolean, max: number = 12) {
  const base = useMemo(() => ownIds.slice(0, 5), [ownIds.join(',')]);   // eslint-disable-line react-hooks/exhaustive-deps
  const insights = useQueries({
    queries: base.map(id => ({
      queryKey: ['tagInsight', id], queryFn: () => fetchTagInsight(id), staleTime: 1000 * 60 * 15, enabled: enabled && !!id,
    })),
  });
  const loadingInsights = enabled && insights.some(q => q.isLoading);
  const candidates = useMemo(
    () => interleaveRelated(insights.map(q => q.data?.related ?? []), new Set(ownIds), new Set(), 24),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insights.map(q => q.dataUpdatedAt).join(','), ownIds.join(',')],
  );
  const tags = useTagsByIds(candidates);
  const list = useMemo(() => {
    const byId = new Map(tags.map((t: any) => [t.id, t]));
    return candidates.map(id => byId.get(id) as any).filter((t: any) => t && !t.isPrimary && !t.isErotic)
      .slice(0, max).map((t: any) => ({ id: t.id, name: t.name, liveCount: 0 }) as ListedTag);
  }, [tags, candidates, max]);
  return { tags: list, isLoading: loadingInsights || (candidates.length > 0 && tags.length === 0) };
}

export { pickTryNew };
