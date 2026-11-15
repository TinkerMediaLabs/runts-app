import { bandsForLengths, buildLadder, mergeLinks, rankCandidates, pickedTitle, MAX_LENGTH_BANDS } from '../lib/moodPicks';

const lengths = [
  { key: 'short', label: 'Short and sweet', minBand: 0, maxBand: 0 },
  { key: 'medium', label: 'Medium', minBand: 1, maxBand: 1 },
  { key: 'long', label: 'A little longer', minBand: 2, maxBand: 3 },
  { key: 'xl', label: 'Extra-long', minBand: 4, maxBand: 5 },
  { key: 'open', label: 'Epic', minBand: 6, maxBand: null },
];

describe('bandsForLengths', () => {
  it('covers each option range', () => {
    expect(bandsForLengths(lengths, ['short'])).toEqual([0]);
    expect(bandsForLengths(lengths, ['long'])).toEqual([2, 3]);
    expect(bandsForLengths(lengths, ['short', 'long'])).toEqual([0, 2, 3]);
  });
  it('is empty when nothing is chosen or the key is unknown', () => {
    expect(bandsForLengths(lengths, [])).toEqual([]);
    expect(bandsForLengths(lengths, ['nope'])).toEqual([]);
  });
  it('bounds an option with no upper limit and caps the total', () => {
    const open = bandsForLengths(lengths, ['open']);
    expect(open[0]).toBe(6);
    expect(open.length).toBeLessThanOrEqual(MAX_LENGTH_BANDS);
    expect(bandsForLengths(lengths, ['short', 'medium', 'long', 'xl', 'open']).length).toBe(MAX_LENGTH_BANDS);
  });
});

describe('buildLadder', () => {
  it('goes strict, then drops length, then drops genre', () => {
    const steps = buildLadder({ moodIds: ['m1'], genreIds: ['g1'], lengthKeys: ['short'] });
    expect(steps).toEqual([
      { level: 0, tagIds: ['m1', 'g1'], useLength: true },
      { level: 1, tagIds: ['m1', 'g1'], useLength: false },
      { level: 2, tagIds: ['m1'], useLength: false },
    ]);
  });
  it('skips steps that would repeat', () => {
    expect(buildLadder({ moodIds: ['m1'], genreIds: [], lengthKeys: [] })).toEqual([{ level: 0, tagIds: ['m1'], useLength: false }]);
    expect(buildLadder({ moodIds: ['m1'], genreIds: [], lengthKeys: ['short'] }).map(s => s.useLength)).toEqual([true, false]);
  });
  it('is empty when no tags are chosen', () => {
    expect(buildLadder({ moodIds: [], genreIds: [], lengthKeys: ['short'] })).toEqual([]);
  });
});

describe('mergeLinks and rankCandidates', () => {
  const rows = [
    { storyId: 's1', tagId: 'm1', publishedAt: '2026-01-01' },
    { storyId: 's2', tagId: 'm1', publishedAt: '2026-03-01' },
    { storyId: 's2', tagId: 'g1', publishedAt: '2026-03-01' },
    { storyId: 's3', tagId: 'g1', publishedAt: '2026-02-01' },
    { storyId: null, tagId: 'g1' },
  ];
  it('merges tags per story and ignores rows without a story', () => {
    const c = mergeLinks(rows);
    expect(c.length).toBe(3);
    expect(c.find(x => x.storyId === 's2')!.tagIds.size).toBe(2);
  });
  it('ranks more matched tags first, then trending, then newest', () => {
    const c = mergeLinks(rows);
    expect(rankCandidates(c, new Set(), new Set())).toEqual(['s2', 's3', 's1']);
    expect(rankCandidates(c, new Set(['s1']), new Set())).toEqual(['s2', 's1', 's3']);
  });
  it('drops stories already listened to', () => {
    expect(rankCandidates(mergeLinks(rows), new Set(), new Set(['s2']))).toEqual(['s3', 's1']);
  });
});

describe('pickedTitle', () => {
  it('keeps the plain title for a full match and is honest otherwise', () => {
    expect(pickedTitle(0, ['Dark and scary'])).toBe('Picked for today');
    expect(pickedTitle(1, ['Dark and scary'])).toBe('Closest matches for Dark and scary');
  });
});

import { bandRuns, isEmptyChoice, describeChoice, shouldPromptMood } from '../lib/moodPicks';

describe('bandRuns', () => {
  it('joins consecutive bands into one seconds range', () => {
    expect(bandRuns([0])).toEqual([[0, 899]]);
    expect(bandRuns([2, 3])).toEqual([[1800, 3599]]);
    expect(bandRuns([5, 2, 3])).toEqual([[1800, 3599], [4500, 5399]]);
    expect(bandRuns([])).toEqual([]);
  });
});

describe('isEmptyChoice and describeChoice', () => {
  it('treats no picks (or null) as empty', () => {
    expect(isEmptyChoice(null)).toBe(true);
    expect(isEmptyChoice({ moodIds: [], genreIds: [], lengthKeys: [] })).toBe(true);
    expect(isEmptyChoice({ moodIds: ['m'], genreIds: [], lengthKeys: [] })).toBe(false);
  });
  it('lists moods, genres, then lengths (using the length subtitle)', () => {
    const text = describeChoice(
      { moodIds: ['m1'], genreIds: ['g1'], lengthKeys: ['short'] },
      [{ id: 'm1', name: 'Dark and scary' }], [{ id: 'g1', name: 'Mystery' }],
      [{ key: 'short', label: 'Short and sweet', subtitle: 'Under 15 minutes' }],
    );
    expect(text).toBe('Dark and scary, Mystery, Under 15 minutes');
  });
});

describe('shouldPromptMood', () => {
  const ok = { signedInOrGuest: true, promptedToday: false, openedFromOutside: false, storyLoaded: false, popupOpen: false };
  it('asks on a clean first open of the day', () => { expect(shouldPromptMood(ok)).toBe(true); });
  it('stays away for each blocker', () => {
    expect(shouldPromptMood({ ...ok, signedInOrGuest: false })).toBe(false);
    expect(shouldPromptMood({ ...ok, promptedToday: true })).toBe(false);
    expect(shouldPromptMood({ ...ok, openedFromOutside: true })).toBe(false);
    expect(shouldPromptMood({ ...ok, storyLoaded: true })).toBe(false);
    expect(shouldPromptMood({ ...ok, popupOpen: true })).toBe(false);
  });
});
