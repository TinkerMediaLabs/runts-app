// Pure logic for the Discover subgenre lists (no network), so it can be tested.

export interface ListedTag {
  id: string;
  name: string;
  liveCount: number;
  listens7?: number | null;
  listens7At?: string | null;
}

export const LISTENS_FRESH_MS = 2 * 24 * 60 * 60 * 1000;   // the hourly job's numbers older than this are ignored

// "Popular right now": subgenres ranked by plays in the last 7 days. In a quiet week (or a new catalog) the list
// is filled up with the subgenres that have the most live stories, so the row is never empty or tiny.
export function pickPopular(byListens: ListedTag[], byCount: ListedTag[], now: number, limit: number): ListedTag[] {
  const out: ListedTag[] = [];
  const seen = new Set<string>();
  const fresh = byListens
    .filter(t => (t.listens7 ?? 0) > 0 && !!t.listens7At && now - Date.parse(t.listens7At) < LISTENS_FRESH_MS)
    .sort((a, b) => (b.listens7 ?? 0) - (a.listens7 ?? 0) || (a.name < b.name ? -1 : 1));
  for (const t of fresh) { if (out.length >= limit) break; out.push(t); seen.add(t.id); }
  const bigger = [...byCount].sort((a, b) => b.liveCount - a.liveCount || (a.name < b.name ? -1 : 1));
  for (const t of bigger) { if (out.length >= limit) break; if (!seen.has(t.id)) { out.push(t); seen.add(t.id); } }
  return out;
}

// Random pick of n items without repeats, bigger weights more likely. `rng` is injectable for tests.
export function weightedSample<T>(items: T[], n: number, weight: (t: T) => number, rng: () => number = Math.random): T[] {
  const pool = items.map(t => ({ t, w: Math.max(0.0001, weight(t)) }));
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
    out.push(pool[i].t);
    pool.splice(i, 1);
  }
  return out;
}

export interface LetterSection<T> { letter: string; data: T[] }

// First letter used for A-Z sections: accents removed; anything that is not a letter goes under '#'.
export function letterOf(name: string): string {
  const c = (name ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

// Groups an alphabetically sorted list into A..Z sections; '#' (digits, symbols) goes last.
export function groupByLetter<T extends { name: string }>(items: T[]): LetterSection<T>[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const l = letterOf(it.name);
    map.set(l, [...(map.get(l) ?? []), it]);
  }
  return Array.from(map, ([letter, data]) => ({ letter, data }))
    .sort((a, b) => (a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter < b.letter ? -1 : 1));
}

// Related genres of the listener's genres, taken in turn from each so one genre cannot crowd out the rest.
// Genres the listener already has, and ids in `exclude`, are left out. Returns at most `max` ids.
export function interleaveRelated(relatedByGenre: string[][], own: Set<string>, exclude: Set<string>, max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...relatedByGenre.map(r => r.length));
  for (let i = 0; i < longest && out.length < max; i++) {
    for (const list of relatedByGenre) {
      const id = list[i];
      if (!id || seen.has(id) || own.has(id) || exclude.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= max) break;
    }
  }
  return out;
}

// "Try something new": popular subgenres the listener has not listened to or picked.
export function pickTryNew(popular: ListedTag[], listenedTagIds: string[], pickedIds: string[], limit: number): ListedTag[] {
  const skip = new Set([...listenedTagIds, ...pickedIds]);
  return popular.filter(t => !skip.has(t.id)).slice(0, limit);
}
