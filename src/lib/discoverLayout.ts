// What the Discover screen shows is a list of sections the CMS controls (HomeSection rows with layoutPk
// 'DISCOVER'). Pure logic: which rows are active, in what order, and what to show when none are set up.
import { isSectionActive, type HomeSectionRow } from './homeLayout';

export type DiscoverSectionType =
  | 'discoverGenres' | 'discoverPopular' | 'discoverFeatured' | 'discoverShuffle'
  | 'discoverBecause' | 'discoverTryNew' | 'discoverCatalog';

export const DISCOVER_SECTION_TYPES: DiscoverSectionType[] = [
  'discoverGenres', 'discoverPopular', 'discoverFeatured', 'discoverShuffle',
  'discoverBecause', 'discoverTryNew', 'discoverCatalog',
];

export const MAX_DISCOVER_SECTIONS = 20;

export const DEFAULT_DISCOVER_LAYOUT: HomeSectionRow[] = [
  { id: 'default-genres',  type: 'discoverGenres',  sortOrder: 10 },
  { id: 'default-popular', type: 'discoverPopular', sortOrder: 20, limit: 12 },
  { id: 'default-because', type: 'discoverBecause', sortOrder: 30 },
  { id: 'default-tryNew',  type: 'discoverTryNew',  sortOrder: 40, limit: 10 },
  { id: 'default-shuffle', type: 'discoverShuffle', sortOrder: 50 },
  { id: 'default-catalog', type: 'discoverCatalog', sortOrder: 60 },
];

// rows: what the CMS saved (undefined = could not load). No rows at all means no layout was ever set up, so
// the default shows. Rows that exist but are all switched off or out of schedule mean an empty list on purpose.
export function resolveDiscoverLayout(rows: (HomeSectionRow | null)[] | null | undefined, now: number): HomeSectionRow[] {
  const list = (rows ?? []).filter((r): r is HomeSectionRow => !!r && !!r.id);
  if (list.length === 0) return DEFAULT_DISCOVER_LAYOUT;
  return list
    .filter(r => (DISCOVER_SECTION_TYPES as string[]).includes(r.type) && isSectionActive(r, now))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, MAX_DISCOVER_SECTIONS);
}
