// Related-genre logic for the Tag Home screen. Pure (no AWS imports) so it can be unit tested.

export interface TagLink { storyId: string; tagId: string; publishedAt?: string | null }

export interface TagInsightResult {
  liveCount: number;
  related: { tagId: string; count: number }[];   // best first
  shared: Record<string, string[]>;              // related tagId -> newest shared story ids
}

export interface InsightOptions {
  relatedMax: number;    // related genres kept per tag
  sharedFor: number;     // how many of the top related genres also get a "shared stories" list
  sharedMax: number;     // stories kept per shared list
}

export const DEFAULTS: InsightOptions = { relatedMax: 8, sharedFor: 3, sharedMax: 12 };

const key = (a: string, b: string) => `${a}|${b}`;

// Two genres are related when many live stories carry both. Ranking uses cosine similarity
// (shared / sqrt(sizeA * sizeB)), not the raw count, so a huge genre does not show up as "related"
// to everything. Erotic genres only relate to erotic genres.
export function computeInsights(links: TagLink[], eroticTagIds: Set<string>, opts: InsightOptions = DEFAULTS): Map<string, TagInsightResult> {
  const byStory = new Map<string, { tags: Set<string>; pub: string }>();
  for (const l of links) {
    if (!l.storyId || !l.tagId) continue;
    const e = byStory.get(l.storyId) ?? { tags: new Set<string>(), pub: '' };
    e.tags.add(l.tagId);
    if ((l.publishedAt ?? '') > e.pub) e.pub = l.publishedAt ?? '';
    byStory.set(l.storyId, e);
  }

  const size = new Map<string, number>();
  const pair = new Map<string, number>();
  for (const { tags } of byStory.values()) {
    const list = Array.from(tags);
    for (const a of list) size.set(a, (size.get(a) ?? 0) + 1);
    for (const a of list) for (const b of list) {
      if (a === b || eroticTagIds.has(a) !== eroticTagIds.has(b)) continue;
      pair.set(key(a, b), (pair.get(key(a, b)) ?? 0) + 1);
    }
  }

  const candidates = new Map<string, { tagId: string; count: number; score: number }[]>();
  for (const [k, count] of pair) {
    const [a, b] = k.split('|');
    const score = count / Math.sqrt((size.get(a) ?? 1) * (size.get(b) ?? 1));
    const arr = candidates.get(a) ?? [];
    arr.push({ tagId: b, count, score });
    candidates.set(a, arr);
  }

  const out = new Map<string, TagInsightResult>();
  for (const [tagId, n] of size) out.set(tagId, { liveCount: n, related: [], shared: {} });
  for (const [tagId, arr] of candidates) {
    arr.sort((x, y) => y.score - x.score || y.count - x.count || (x.tagId < y.tagId ? -1 : 1));
    out.get(tagId)!.related = arr.slice(0, opts.relatedMax).map(({ tagId: t, count }) => ({ tagId: t, count }));
  }

  // Second pass: the newest stories that carry BOTH genres, only for the few pairs that will be shown.
  const wanted = new Map<string, string[]>();     // "a|b" -> storyIds (kept sorted newest first)
  for (const [tagId, r] of out) r.related.slice(0, opts.sharedFor).forEach(x => wanted.set(key(tagId, x.tagId), []));
  if (wanted.size) {
    const stories = Array.from(byStory, ([id, v]) => ({ id, tags: v.tags, pub: v.pub }))
      .sort((x, y) => (y.pub < x.pub ? -1 : y.pub > x.pub ? 1 : x.id < y.id ? -1 : 1));
    for (const st of stories) {
      for (const a of st.tags) for (const b of st.tags) {
        const list = wanted.get(key(a, b));
        if (list && list.length < opts.sharedMax) list.push(st.id);
      }
    }
    for (const [k, ids] of wanted) {
      const [a, b] = k.split('|');
      out.get(a)!.shared[b] = ids;
    }
  }
  return out;
}


// What a genre contributes to the Discover lists. A subgenre is listed only while it has live stories, so the
// sparse indexes never hold an empty one. Primary and erotic genres are never listed (they have their own areas).
export type TagMeta = { id: string; name?: string; isPrimary?: boolean; isErotic?: boolean };
export function discoverFields(tag: TagMeta, liveCount: number): { name: string; nameLower: string; listed: boolean } {
  const name = (tag.name ?? '').trim();
  return {
    name,
    nameLower: name.toLowerCase(),
    listed: !!name && liveCount > 0 && !tag.isPrimary && !tag.isErotic,
  };
}

// Rows whose genre no longer exists.
export function staleInsightIds(insightIds: string[], tagIds: Set<string>): string[] {
  return insightIds.filter(id => !tagIds.has(id));
}
