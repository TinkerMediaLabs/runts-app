// What a listener likes, worked out from what they actually listened to. Pure logic (no network) so it can
// be tested; hooks/queries/useTasteProfile.ts gathers the data.

// "Listened" = finished, or played at least half of it.
export function isListened(finished: boolean, progressSeconds: number | null | undefined, duration: number | null | undefined): boolean {
  if (finished) return true;
  const p = Number(progressSeconds ?? 0), d = Number(duration ?? 0);
  return d > 0 && p >= d * 0.5;
}

export interface TasteEntry {
  primaryTagId?: string | null;
  secondaryTagId?: string | null;
  isErotic?: string | null;
  weight: number;      // finished stories count more than half-listened ones
}

// `entries` newest first: more recent listening counts for more, so tastes can change over time.
// The main genre of a story counts fully, its second genre less. Erotic stories and excluded tags
// (e.g. the genres the listener already picked) never count. Returns the top `n` tag ids.
export function topTags(entries: TasteEntry[], exclude: Set<string>, n: number): string[] {
  const score = new Map<string, number>();
  const add = (id: string | null | undefined, w: number) => {
    if (!id || exclude.has(id)) return;
    score.set(id, (score.get(id) ?? 0) + w);
  };
  entries.forEach((e, i) => {
    if (e.isErotic === 'true') return;
    const recency = Math.pow(0.95, i);
    add(e.primaryTagId, e.weight * recency);
    add(e.secondaryTagId, e.weight * recency * 0.4);
  });
  return Array.from(score, ([id, s]) => ({ id, s }))
    .sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map(x => x.id);
}

// Genres that exist now but the listener has not been told about yet.
export function newGenreIds(allIds: string[], seen: string[]): string[] {
  const s = new Set(seen);
  return allIds.filter(id => !s.has(id));
}
