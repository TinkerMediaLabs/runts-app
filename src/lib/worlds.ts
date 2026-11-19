// Worlds are tags of type 'universe'. Pure logic for which ones to show and in what order, so it can be tested.
export type World = {
  id: string;
  name: string;
  nameLower?: string | null;
  description?: string | null;
  tileImageUri?: string | null;
  heroImageUri?: string | null;
  storyCount?: number | null;
  isErotic?: boolean | null;
};

export const WORLD_PREVIEW_COUNT = 4;

// Worlds a listener may see: they must have a name, at least one live story (when the count is known), and an
// erotic world only shows when the listener has erotic content turned on.
export function visibleWorlds<T extends World>(rows: (T | null | undefined)[], eroticEnabled: boolean): T[] {
  return rows.filter((w): w is T => {
    if (!w || !w.id || !(w.name ?? '').trim()) return false;
    if (w.isErotic && !eroticEnabled) return false;
    if (typeof w.storyCount === 'number' && w.storyCount <= 0) return false;
    return true;
  });
}

// The worlds to preview: the ones with the most stories first, then by name. (Later this is where a listener's
// taste will reorder them.) Never more than `count`.
export function pickWorlds<T extends World>(rows: (T | null | undefined)[], eroticEnabled: boolean, count: number = WORLD_PREVIEW_COUNT): T[] {
  return visibleWorlds(rows, eroticEnabled)
    .slice()
    .sort((a, b) => (b.storyCount ?? 0) - (a.storyCount ?? 0) || (a.nameLower ?? a.name.toLowerCase()).localeCompare(b.nameLower ?? b.name.toLowerCase()))
    .slice(0, Math.max(0, count));
}

export function storiesLabel(n: number | null | undefined): string {
  const c = n ?? 0;
  return c === 1 ? '1 story' : `${c} stories`;
}
