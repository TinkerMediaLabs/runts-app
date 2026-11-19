import { matchesDuration, type DurationFilter } from '../hooks/queries/useSearch';

// Filters the pinned list on the phone: by words in the title or genre names, by length, and by genre.
// Pure, so it can be tested. `storyOf` gives the story for a pin (or undefined while it is still loading),
// `tagName` gives a genre's name.
export type PinnedFilter = { query: string; duration: DurationFilter; tagId: string | null };

export const NO_PINNED_FILTER: PinnedFilter = { query: '', duration: 'any', tagId: null };

export function pinnedFilterActive(f: PinnedFilter): boolean {
  return f.query.trim().length > 0 || f.duration !== 'any' || f.tagId !== null;
}

export function filterPinned<T extends { storyId: string }>(
  pins: T[],
  f: PinnedFilter,
  storyOf: (storyId: string) => any | undefined,
  tagName: (tagId?: string | null) => string,
): T[] {
  if (!pinnedFilterActive(f)) return pins;
  const q = f.query.trim().toLowerCase();
  return pins.filter(pin => {
    const story = storyOf(pin.storyId);
    if (!story) return false; // not loaded yet, so it cannot be matched
    if (f.tagId && story.primaryTagId !== f.tagId && story.secondaryTagId !== f.tagId) return false;
    if (!matchesDuration(story, f.duration)) return false;
    if (!q) return true;
    const hay = [story.title, tagName(story.primaryTagId), tagName(story.secondaryTagId)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
