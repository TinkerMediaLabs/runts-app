// What the Home screen shows is a list of sections the CMS controls (HomeSection rows). This file is the pure
// logic: which rows are active right now, in what order, and what to show when there are none.

export type HomeSectionType =
  | 'forYou' | 'continueListening' | 'becauseYou' | 'genres'
  | 'newStories' | 'featuredAuthor' | 'handPicked' | 'trending';

export const HOME_SECTION_TYPES: HomeSectionType[] = [
  'forYou', 'continueListening', 'becauseYou', 'genres', 'newStories', 'featuredAuthor', 'handPicked', 'trending',
];

export const MAX_HOME_SECTIONS = 20;

export interface HomeSectionRow {
  id: string;
  type: string;
  title?: string | null;
  blurb?: string | null;
  sortOrder: number;
  enabled?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  limit?: number | null;
  authorId?: string | null;
  storyIds?: (string | null)[] | null;
  windowDays?: number | null;
  tagIds?: (string | null)[] | null;
  hideTagIds?: (string | null)[] | null;
}

// Shown when no layout has been set up yet (a fresh environment) or it cannot be loaded: the same Home
// the app had before the CMS controlled it.
export const DEFAULT_LAYOUT: HomeSectionRow[] = [
  { id: 'default-forYou',            type: 'forYou',            sortOrder: 10, limit: 8 },
  { id: 'default-continueListening', type: 'continueListening', sortOrder: 20 },
  { id: 'default-becauseYou',        type: 'becauseYou',        sortOrder: 30 },
  { id: 'default-genres',            type: 'genres',            sortOrder: 40, limit: 3 },
];

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function isSectionActive(row: HomeSectionRow, now: number): boolean {
  if (row.enabled === false) return false;
  const start = time(row.startsAt);
  const end = time(row.endsAt);
  if (start !== null && now < start) return false;
  if (end !== null && now >= end) return false;
  return true;
}

// rows: what the CMS saved (undefined = could not load). No rows at all means no layout was ever set up,
// so the default shows. Rows that exist but are all switched off or out of schedule mean an empty Home on
// purpose.
export function resolveHomeLayout(rows: (HomeSectionRow | null)[] | null | undefined, now: number): HomeSectionRow[] {
  const list = (rows ?? []).filter((r): r is HomeSectionRow => !!r && !!r.id);
  if (list.length === 0) return DEFAULT_LAYOUT;
  return list
    .filter(r => (HOME_SECTION_TYPES as string[]).includes(r.type) && isSectionActive(r, now))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, MAX_HOME_SECTIONS);
}
