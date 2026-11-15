// "Picked for today": the pure logic behind the daily mood curation. No network here, so it is easy to test.
//
// A choice is some moods, some genres and some lengths. Stories are found through the StoryTag length-band index:
// "this tag, this 15-minute band, newest first", one small query each. A story that carries several of the chosen
// tags ranks above one that carries one. When too few stories match, a fallback ladder loosens the choice step by step
// (drop length, then genre) so the row is never empty, and the title says honestly that these are the closest matches.

export type PickerLength = { key: string; label: string; minBand?: number | null; maxBand?: number | null };

export type Choice = { moodIds: string[]; genreIds: string[]; lengthKeys: string[] };

export const PAGE = 20;            // stories read per (tag, band) query
export const MIN_MATCHES = 6;      // fewer than this and the next ladder step runs
export const MAX_LENGTH_BANDS = 6; // ceiling on bands per tag, so "no upper limit" cannot fan out into dozens of queries
export const OPEN_ENDED_BANDS = 6; // how many bands an option with no upper limit covers beyond its minimum

// The 15-minute bands covered by the chosen length options (sorted, no repeats, capped).
export function bandsForLengths(options: PickerLength[], keys: string[]): number[] {
  const set = new Set<number>();
  for (const o of options) {
    if (!keys.includes(o.key)) continue;
    const min = o.minBand ?? 0;
    const max = o.maxBand ?? min + OPEN_ENDED_BANDS - 1;
    for (let b = min; b <= max; b++) set.add(b);
  }
  return [...set].sort((a, b) => a - b).slice(0, MAX_LENGTH_BANDS);
}

export type LadderStep = { level: number; tagIds: string[]; useLength: boolean };

// The searches to try, strictest first. Level 0 is the full choice; each later level is looser. Steps that would repeat
// the one before are left out (for example, no lengths chosen means there is no "drop length" step).
export function buildLadder(choice: Choice): LadderStep[] {
  const all = unique([...choice.moodIds, ...choice.genreIds]);
  const hasLength = choice.lengthKeys.length > 0;
  const steps: LadderStep[] = [];
  const add = (tagIds: string[], useLength: boolean) => {
    if (!tagIds.length) return;
    const prev = steps[steps.length - 1];
    if (prev && prev.useLength === useLength && prev.tagIds.join(',') === tagIds.join(',')) return;
    steps.push({ level: steps.length, tagIds, useLength });
  };
  add(all, hasLength);
  if (hasLength) add(all, false);
  if (choice.moodIds.length && choice.genreIds.length) add(choice.moodIds, false);
  return steps;
}

export type LinkRow = { storyId?: string | null; tagId?: string | null; publishedAt?: string | null };
export type Candidate = { storyId: string; tagIds: Set<string>; publishedAt: string };

export function mergeLinks(rows: LinkRow[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const r of rows) {
    if (!r.storyId || !r.tagId) continue;
    const c = map.get(r.storyId) ?? { storyId: r.storyId, tagIds: new Set<string>(), publishedAt: r.publishedAt ?? '' };
    c.tagIds.add(r.tagId);
    if ((r.publishedAt ?? '') > c.publishedAt) c.publishedAt = r.publishedAt ?? '';
    map.set(r.storyId, c);
  }
  return [...map.values()];
}

// Most chosen tags matched first, then stories trending in a chosen mood, then newest. Already-listened stories are dropped.
export function rankCandidates(cands: Candidate[], trending: Set<string>, listened: Set<string>): string[] {
  return cands
    .filter(c => !listened.has(c.storyId))
    .sort((a, b) =>
      b.tagIds.size - a.tagIds.size ||
      Number(trending.has(b.storyId)) - Number(trending.has(a.storyId)) ||
      (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))
    .map(c => c.storyId);
}

// The row title. The full match keeps the plain title; looser steps say so honestly.
export function pickedTitle(level: number, names: string[], base = 'Picked for today'): string {
  if (level === 0 || !names.length) return base;
  return `Closest matches for ${names.join(', ')}`;
}

export function unique<T>(list: T[]): T[] { return [...new Set(list)]; }

// Consecutive bands as seconds ranges [from, to]: bands 2,3 and 5 become [1800, 3599] and [4500, 5399]. Used for a
// length-only choice, which reads the Story length index once per range.
export function bandRuns(bands: number[]): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  for (const b of [...bands].sort((x, y) => x - y)) {
    const last = runs[runs.length - 1];
    if (last && b * 900 === last[1] + 1) last[1] = (b + 1) * 900 - 1;
    else runs.push([b * 900, (b + 1) * 900 - 1]);
  }
  return runs;
}

export const isEmptyChoice = (c: Choice | null | undefined) =>
  !c || (!c.moodIds.length && !c.genreIds.length && !c.lengthKeys.length);

// "Dark and scary, Mystery, Under 15 minutes" for the Today chip.
export function describeChoice(
  choice: Choice,
  moods: Array<{ id: string; name: string }>,
  genres: Array<{ id: string; name: string }>,
  lengths: Array<{ key: string; label: string; subtitle?: string | null }>,
): string {
  return [
    ...choice.moodIds.map(id => moods.find(m => m.id === id)?.name),
    ...choice.genreIds.map(id => genres.find(g => g.id === id)?.name),
    ...choice.lengthKeys.map(k => { const o = lengths.find(l => l.key === k); return o ? (o.subtitle || o.label) : undefined; }),
  ].filter(Boolean).join(', ');
}

// Whether the daily sheet should open right now. Pure so the rules can be tested.
export type PromptContext = {
  signedInOrGuest: boolean;     // false while starting up, signed out, or still in onboarding
  promptedToday: boolean;       // already asked (or answered, or signed up) on this local day
  openedFromOutside: boolean;   // launched from a shared link or a notification
  storyLoaded: boolean;         // a story is playing or being resumed
  popupOpen: boolean;           // the rating popup or the Keep going sheet is up
};
export function shouldPromptMood(c: PromptContext): boolean {
  return c.signedInOrGuest && !c.promptedToday && !c.openedFromOutside && !c.storyLoaded && !c.popupOpen;
}
