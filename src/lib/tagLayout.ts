// The Tag Home screen (the mini home page of one genre). Pure logic: how big the genre is, which rows it
// gets, and which stories go in which row without any story appearing twice.
import { isSectionActive, type HomeSectionRow } from './homeLayout';

export type TagSectionType =
  | 'tagFeatured' | 'tagTrending' | 'tagPopular' | 'tagNew' | 'tagShort' | 'tagShared'
  | 'tagMoreLike' | 'tagRelated' | 'tagAll' | 'tagBrowseAll' | 'featuredAuthor' | 'handPicked';

export const TAG_SECTION_TYPES: TagSectionType[] = [
  'tagFeatured', 'tagTrending', 'tagPopular', 'tagNew', 'tagShort', 'tagShared',
  'tagMoreLike', 'tagRelated', 'tagAll', 'tagBrowseAll', 'featuredAuthor', 'handPicked',
];

export type SizeTier = 'empty' | 'small' | 'medium' | 'large';
export const SMALL_MAX = 6;      // 1 to 6 live stories
export const MEDIUM_MAX = 30;    // 7 to 30; more than that is large
export const MIN_ROW = 3;        // a row with fewer stories than this is not shown (it would look empty)
export const ROW_LIMIT = 10;
export const FEATURED_COUNT = 5;
export const SHARED_ROWS = 3;
export const MAX_RELATED = 8;
export const TREND_FRESH_MS = 2 * 24 * 60 * 60 * 1000;   // a genre's trending list older than this is ignored

export function sizeTier(liveCount: number): SizeTier {
  if (liveCount <= 0) return 'empty';
  if (liveCount <= SMALL_MAX) return 'small';
  if (liveCount <= MEDIUM_MAX) return 'medium';
  return 'large';
}

const row = (type: TagSectionType, extra: Partial<HomeSectionRow> = {}): HomeSectionRow =>
  ({ id: `builtin-${type}`, type, sortOrder: 0, ...extra });

// What a genre shows when the CMS has set nothing up for it, by size.
export function builtInTagLayout(tier: SizeTier): HomeSectionRow[] {
  const list: HomeSectionRow[] =
    tier === 'empty' ? [row('tagRelated')] :
    tier === 'small' ? [row('tagAll'), row('tagMoreLike'), row('tagRelated')] :
    tier === 'medium' ? [row('tagNew', { limit: 8 }), row('tagPopular', { limit: 8 }), row('tagShort', { limit: 8 }), row('tagMoreLike'), row('tagRelated'), row('tagBrowseAll')] :
    [row('tagFeatured'), row('tagTrending'), row('tagPopular'), row('tagNew'), row('tagShort'), row('tagShared'), row('tagRelated'), row('tagBrowseAll')];
  return list.map((r, i) => ({ ...r, sortOrder: (i + 1) * 10 }));
}

// Rows the CMS set for this genre (its own rows win over the template for all genres). `null` = none set up.
export function pickTagLayout(own: (HomeSectionRow | null)[] | null | undefined, template: (HomeSectionRow | null)[] | null | undefined, now: number): HomeSectionRow[] | null {
  const clean = (rows: (HomeSectionRow | null)[] | null | undefined) =>
    (rows ?? []).filter((r): r is HomeSectionRow => !!r && !!r.id);
  const chosen = clean(own).length ? clean(own) : clean(template);
  if (!chosen.length) return null;
  return chosen
    .filter(r => (TAG_SECTION_TYPES as string[]).includes(r.type) && isSectionActive(r, now))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// Related genres in display order: the ones the editor pinned first (as set), then the computed ones,
// minus anything hidden. Pinned genres are kept even when they have no overlap yet.
export function orderRelated(auto: string[], pinned: string[], hidden: string[], max: number = MAX_RELATED): string[] {
  const hide = new Set(hidden);
  const out: string[] = [];
  for (const id of [...pinned, ...auto]) {
    if (!id || hide.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out.slice(0, max);
}

export interface Pools {
  trending: any[];
  popular: any[];
  new: any[];
  short: any[];
  all: any[];                                   // every live story (small and medium genres)
  moreLike: any[];                              // stories from related genres
  shared: { tagId: string; stories: any[] }[];  // stories this genre shares with its top related genres
  browse: any[];                                // the paged "all stories" list of a large genre
}

export interface TagRow {
  key: string;
  type: TagSectionType;
  section: HomeSectionRow;
  title?: string;
  stories: any[];
  relatedTagId?: string;
}

// Turns the chosen sections into rows. Walks them in order; a story used by an earlier row is left out of
// later ones, and a row with fewer than MIN_ROW stories is dropped (so a small genre never shows a lonely row).
export function buildTagRows(sections: HomeSectionRow[], pools: Pools, ctx: { tagName: string; tagNames: Record<string, string> }): TagRow[] {
  const used = new Set<string>();
  const out: TagRow[] = [];
  const take = (list: any[], limit: number) => {
    const picked: any[] = [];
    for (const s of list) {
      if (!s?.id || used.has(s.id) || picked.some(p => p.id === s.id)) continue;
      picked.push(s);
      if (picked.length >= limit) break;
    }
    return picked;
  };
  const push = (r: TagRow) => { r.stories.forEach(s => used.add(s.id)); out.push(r); };

  for (const section of sections) {
    const limit = section.limit && section.limit > 0 ? section.limit : ROW_LIMIT;
    const base = { key: section.id, type: section.type as TagSectionType, section };
    switch (section.type as TagSectionType) {
      case 'tagFeatured': {
        const stories = take([...pools.trending, ...pools.popular, ...pools.new], FEATURED_COUNT);
        if (stories.length >= MIN_ROW) push({ ...base, stories });
        break;
      }
      case 'tagTrending': case 'tagPopular': case 'tagNew': case 'tagShort': {
        const pool = section.type === 'tagTrending' ? pools.trending : section.type === 'tagPopular' ? pools.popular
          : section.type === 'tagNew' ? pools.new : pools.short;
        const stories = take(pool, limit);
        if (stories.length >= MIN_ROW) push({ ...base, stories });
        break;
      }
      case 'tagShared': {
        for (const p of pools.shared.slice(0, SHARED_ROWS)) {
          const stories = take(p.stories, limit);
          if (stories.length >= MIN_ROW) push({ ...base, key: `${section.id}-${p.tagId}`, stories, relatedTagId: p.tagId, title: `${ctx.tagName} + ${ctx.tagNames[p.tagId] ?? ''}`.trim() });
        }
        break;
      }
      case 'tagMoreLike': {
        const stories = take(pools.moreLike, limit);
        if (stories.length >= MIN_ROW) push({ ...base, stories });
        break;
      }
      case 'tagAll': {
        const stories = take(pools.all, 1000);
        if (stories.length) push({ ...base, stories });
        break;
      }
      case 'tagBrowseAll': {
        // Large genres page through everything (no dedupe: it is the full list); medium ones list what is left.
        const stories = pools.browse.length ? pools.browse : take(pools.all, 1000);
        if (stories.length) out.push({ ...base, stories });
        break;
      }
      case 'tagRelated': case 'featuredAuthor': case 'handPicked':
        out.push({ ...base, stories: [] });
        break;
    }
  }
  return out;
}
