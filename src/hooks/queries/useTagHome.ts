import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import type { HomeSectionRow } from '../../lib/homeLayout';
import {
  sizeTier, builtInTagLayout, pickTagLayout, orderRelated, buildTagRows,
  MEDIUM_MAX, SHARED_ROWS, TREND_FRESH_MS, type Pools, type SizeTier, type TagRow,
} from '../../lib/tagLayout';
import { mixRoundRobin } from '../../lib/mixStories';
import {
  useStoriesByStoryTag, useStoriesByTagTrending, useStoriesByTagShort,
} from './useStories';
import { useStoriesByIds } from './useStoriesByIds';
import { useEnrichedStories } from './useEnrichedStories';
import { useTagNames } from './useTagNames';

// ---- the one precomputed row about this genre (size, related genres, shared stories, trending) ---------------

export type TagInsightData = {
  liveCount: number | null;
  related: string[];
  shared: Record<string, string[]>;
  trendingIds: string[];
  trendingAt: string | null;
};

export async function fetchTagInsight(tagId: string): Promise<TagInsightData | null> {
  const client = generateClient<Schema>();
  const res: any = await (client.models as any).TagInsight.get({ id: tagId });
  const d = res?.data;
  if (!d) return null;
  let shared: Record<string, string[]> = {};
  try { shared = d.sharedJson ? JSON.parse(d.sharedJson) : {}; } catch { shared = {}; }
  return {
    liveCount: typeof d.liveCount === 'number' ? d.liveCount : null,
    related: ((d.relatedTagIds ?? []) as (string | null)[]).filter(Boolean) as string[],
    shared,
    trendingIds: ((d.trendingStoryIds ?? []) as (string | null)[]).filter(Boolean) as string[],
    trendingAt: d.trendingAt ?? null,
  };
}

export function useTagInsight(tagId: string) {
  return useQuery({
    queryKey: ['tagInsight', tagId],
    queryFn: () => fetchTagInsight(tagId),
    enabled: !!tagId,
    staleTime: 1000 * 60 * 15,
  });
}

// The CMS rows for this genre: its own, else the template for all genres. null = nothing set up.
export function useTagLayoutRows(tagId: string) {
  const q = useQuery({
    queryKey: ['tagLayout', tagId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const list = async (pk: string) => {
        try {
          const res: any = await (client.models.HomeSection as any).listHomeSectionByLayoutPkAndSortOrder({ layoutPk: pk }, { limit: 50 });
          return (res?.data ?? []) as HomeSectionRow[];
        } catch { return [] as HomeSectionRow[]; }
      };
      const [own, template] = await Promise.all([list(`TAG#${tagId}`), list('TAG_DEFAULT')]);
      return { own, template };
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 5,
  });
  const rows = useMemo(() => (q.data ? pickTagLayout(q.data.own, q.data.template, Date.now()) : null), [q.data]);
  return { rows, isLoading: q.isLoading };
}

export function useTagsByIds(ids: string[]) {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['tag', id],
      queryFn: async () => {
        const client = generateClient<Schema>();
        const { data, errors } = await client.models.Tag.get({ id });
        if (errors) throw new Error(errors[0].message);
        return data;
      },
      staleTime: 1000 * 60 * 30,
      enabled: !!id,
    })),
  });
  const stamp = results.map(r => r.dataUpdatedAt).join(',');
  return useMemo(() => results.map(r => r.data).filter(Boolean) as any[], [stamp]);
}

const byNewest = (a: any, b: any) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? ''));

// ---- everything the Tag Home screen needs ----------------------------------------------------------------------

export function useTagHome(tagId: string, tagName: string, allowErotic: boolean) {
  const insightQ = useTagInsight(tagId);
  const layoutQ = useTagLayoutRows(tagId);
  const insight = insightQ.data ?? null;

  // Size: from the precomputed row, or (new environment, row not written yet) from a look at the first 31 stories.
  // A stored 0 is not trusted (the row can be hours old and the genre may have gained stories since): probe instead.
  const knownTier: SizeTier | null = insight?.liveCount ? sizeTier(insight.liveCount) : null;
  const insightDone = !insightQ.isLoading;
  const probe = insightDone && knownTier === null;
  const wantsAll = knownTier === 'small' || knownTier === 'medium' || probe;
  const allQ = useStoriesByStoryTag(wantsAll ? tagId : '', MEDIUM_MAX + 1);
  const allRaw = useMemo(() => (allQ.data?.pages ?? []).flatMap((p: any) => p.items), [allQ.data]);
  const probeTier: SizeTier | null = allQ.data ? (allQ.hasNextPage ? 'large' : sizeTier(allRaw.length)) : null;
  const tier: SizeTier | null = wantsAll && allQ.hasNextPage ? 'large' : (knownTier ?? probeTier);

  const sections: HomeSectionRow[] = useMemo(
    () => layoutQ.rows ?? (tier ? builtInTagLayout(tier) : []),
    [layoutQ.rows, tier],
  );
  const wants = useMemo(() => new Set(sections.map(s => s.type)), [sections]);

  // Related genres, with the editor's pins and hides.
  const relatedSection = sections.find(s => s.type === 'tagRelated');
  const relatedIds = useMemo(() => orderRelated(
    insight?.related ?? [],
    ((relatedSection?.tagIds ?? []) as (string | null)[]).filter(Boolean) as string[],
    ((relatedSection?.hideTagIds ?? []) as (string | null)[]).filter(Boolean) as string[],
  ), [insight?.related, relatedSection]);
  const relatedTags = useTagsByIds(relatedIds);

  // Large genre lists.
  const large = tier === 'large';
  const newQ = useStoriesByStoryTag(large ? tagId : '', 20);
  const popularQ = useStoriesByTagTrending(large ? tagId : '');
  const shortQ = useStoriesByTagShort(large ? tagId : '');

  // This week's trending in the genre (ignored once the job's list is more than two days old).
  const trendingFresh = !!insight?.trendingAt && Date.now() - new Date(insight.trendingAt).getTime() < TREND_FRESH_MS;
  const trendingIds = useMemo(
    () => (trendingFresh && (wants.has('tagTrending') || wants.has('tagFeatured')) ? (insight?.trendingIds ?? []).slice(0, 12) : []),
    [trendingFresh, wants, insight?.trendingIds],
  );
  const trendingQ = useStoriesByIds(trendingIds);

  // Stories shared with the top related genres.
  const sharedTop = useMemo(() => (wants.has('tagShared') ? relatedIds.slice(0, SHARED_ROWS) : []), [wants, relatedIds]);
  const sharedIds = useMemo(
    () => Array.from(new Set(sharedTop.flatMap(id => insight?.shared?.[id] ?? []))),
    [sharedTop, insight?.shared],
  );
  const sharedQ = useStoriesByIds(sharedIds);

  // "More like this": the newest stories of the top two related genres (small and medium genres).
  const moreIds = relatedIds.slice(0, 2);
  const moreQ = useQuery({
    queryKey: ['tagMoreLike', tagId, moreIds.join(',')],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const lists = await Promise.all(moreIds.map(async rid => {
        try {
          const res: any = await (client.models.StoryTag as any).listStoryTagByLiveTagIdAndPublishedAt(
            { liveTagId: rid }, { sortDirection: 'DESC', limit: 8 });
          const got = await Promise.all(((res?.data ?? []) as any[]).map(l => client.models.Story.get({ id: l.storyId })));
          return got.map(g => g.data).filter((s: any) => s && s.live === 'true');
        } catch { return [] as any[]; }
      }));
      return mixRoundRobin(lists, 12);
    },
    enabled: wants.has('tagMoreLike') && (tier === 'small' || tier === 'medium') && moreIds.length > 0,
    staleTime: 1000 * 60 * 15,
  });

  // Raw pools.
  const raw = useMemo(() => {
    const all: any[] = [...allRaw].sort(byNewest);
    const browse = large ? (newQ.data?.pages ?? []).flatMap((p: any) => p.items) : [];
    const newPool = large ? ((newQ.data?.pages?.[0]?.items ?? []) as any[]) : all;
    const popular = large ? ((popularQ.data ?? []) as any[]) : [...all].sort((a, b) => (b.numListens ?? 0) - (a.numListens ?? 0));
    const short = large ? ((shortQ.data ?? []) as any[]) : [...all].sort((a, b) => (a.duration ?? 1e9) - (b.duration ?? 1e9));
    const sharedById = new Map((sharedQ.stories ?? []).map((s: any) => [s.id, s]));
    const shared = sharedTop.map(id => ({
      tagId: id,
      stories: (insight?.shared?.[id] ?? []).map(sid => sharedById.get(sid)).filter(Boolean) as any[],
    }));
    const inThisTag = new Set(all.map(s => s.id));
    return {
      trending: trendingQ.stories ?? [], popular, new: newPool, short, all: large ? [] : all,
      moreLike: ((moreQ.data ?? []) as any[]).filter(s => !inThisTag.has(s.id)), shared, browse,
    };
  }, [allRaw, large, newQ.data, popularQ.data, shortQ.data, trendingQ.stories, sharedQ.stories, sharedTop, insight?.shared, moreQ.data]);

  // One enrichment pass (names, progress) over every story that might be shown.
  const union = useMemo(() => {
    const seen = new Map<string, any>();
    [raw.trending, raw.popular, raw.new, raw.short, raw.all, raw.moreLike, raw.browse, ...raw.shared.map(p => p.stories)]
      .forEach(list => list.forEach((s: any) => { if (s?.id && !seen.has(s.id)) seen.set(s.id, s); }));
    return Array.from(seen.values());
  }, [raw]);
  const { stories: enrichedAll, tagMap } = useEnrichedStories(union, allowErotic);
  const enrichedById = useMemo(() => new Map(enrichedAll.map((s: any) => [s.id, s])), [enrichedAll]);
  const relatedNames = useTagNames(relatedIds).data ?? {};

  const rows: TagRow[] = useMemo(() => {
    const map = (list: any[]) => list.map(s => enrichedById.get(s.id)).filter(Boolean) as any[];
    const pools: Pools = {
      trending: map(raw.trending), popular: map(raw.popular), new: map(raw.new), short: map(raw.short),
      all: map(raw.all), moreLike: map(raw.moreLike), browse: map(raw.browse),
      shared: raw.shared.map(p => ({ tagId: p.tagId, stories: map(p.stories) })),
    };
    return buildTagRows(sections, pools, { tagName, tagNames: relatedNames as Record<string, string> });
  }, [sections, raw, enrichedById, tagName, relatedNames]);

  const pending =
    insightQ.isLoading || layoutQ.isLoading || tier === null ||
    (wantsAll && allQ.isLoading) ||
    (large && (newQ.isLoading || popularQ.isLoading || shortQ.isLoading)) ||
    (trendingIds.length > 0 && trendingQ.isLoading) ||
    (sharedIds.length > 0 && sharedQ.isLoading) ||
    moreQ.isLoading;

  return {
    ready: !pending,
    tier,
    rows,
    relatedTags,
    tagMap,
    hasMore: large ? !!newQ.hasNextPage : false,
    fetchMore: () => { if (large && newQ.hasNextPage && !newQ.isFetchingNextPage) newQ.fetchNextPage(); },
    fetchingMore: large ? newQ.isFetchingNextPage : false,
  };
}
