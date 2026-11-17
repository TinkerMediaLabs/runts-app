// Round-robin merge of several ranked lists into one: first of each list, then second of each, and so on.
// Skips duplicates (by id), erotic stories and rows without an id, and stops at `limit`. No list can crowd
// out the others. `exclude` ids (e.g. stories already listened to) are skipped.
export function mixRoundRobin(lists: any[][], limit: number, exclude?: Set<string>): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (let i = 0; out.length < limit; i++) {
    let any = false;
    for (const l of lists) {
      const s = l[i];
      if (!s) continue;
      any = true;
      if (!s.id || seen.has(s.id) || exclude?.has(s.id) || s.isErotic === 'true') continue;
      seen.add(s.id);
      out.push(s);
      if (out.length >= limit) break;
    }
    if (!any) break;
  }
  return out;
}

// ---- Why a story is recommended -------------------------------------------------------------------------------
// The For You carousel already knows where every story came from (a picked genre, a learned genre, trending, newest),
// so showing the reason costs no extra queries. A story that qualifies for several shows the strongest, in this
// order: today's mood match, picked genre, followed genre, learned genre, trending, new.
export type ReasonKind = 'mood' | 'picked' | 'followed' | 'learned' | 'trending' | 'new';
export type Reason = { kind: ReasonKind; tagId?: string };
const REASON_RANK: Record<ReasonKind, number> = { mood: 0, picked: 1, followed: 2, learned: 3, trending: 4, new: 5 };

export type ReasonedList = { reason: Reason; stories: any[] };

// Same mixing as mixRoundRobin; every story returned carries `reason`, the strongest one across all the lists it is in.
export function mixWithReasons(sources: ReasonedList[], limit: number, exclude?: Set<string>): any[] {
  const best = new Map<string, Reason>();
  for (const src of sources) {
    for (const s of src.stories) {
      if (!s?.id) continue;
      const have = best.get(s.id);
      if (!have || REASON_RANK[src.reason.kind] < REASON_RANK[have.kind]) best.set(s.id, src.reason);
    }
  }
  return mixRoundRobin(sources.map(s => s.stories), limit, exclude).map(s => ({ ...s, reason: best.get(s.id) }));
}

// The short line on the card. `tagName` is the genre's name for picked and learned reasons; `recentlyPublished` says
// whether "new" really means this week (a young catalog's newest stories may be older).
export function reasonText(reason: Reason | undefined, tagName?: string, recentlyPublished: boolean = true): string {
  if (!reason) return '';
  switch (reason.kind) {
    case 'mood':     return tagName ? `Matches ${tagName}` : '';
    case 'picked':   return tagName ? `Because you like ${tagName}` : '';
    case 'followed': return tagName ? `Because you follow ${tagName}` : '';
    case 'learned':  return tagName ? `Because you listen to ${tagName}` : '';
    case 'trending': return 'Trending this week';
    case 'new':      return recentlyPublished ? 'New this week' : 'Recently added';
  }
}
