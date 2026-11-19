import { filterPinned, pinnedFilterActive, NO_PINNED_FILTER } from '../lib/pinnedFilter';

const stories: Record<string, any> = {
  a: { title: 'Midnight Train', primaryTagId: 't1', secondaryTagId: 't2', duration: 600 },
  b: { title: 'The Long Road', primaryTagId: 't2', secondaryTagId: null, duration: 1500 },
  c: { title: 'Quiet Harbor', primaryTagId: 't3', secondaryTagId: null, duration: 2400 },
};
const pins = [{ storyId: 'a' }, { storyId: 'b' }, { storyId: 'c' }, { storyId: 'x' }];
const storyOf = (id: string) => stories[id];
const names: Record<string, string> = { t1: 'Mystery', t2: 'Adventure', t3: 'Romance' };
const tagName = (id?: string | null) => (id ? names[id] ?? '' : '');
const ids = (f: any) => filterPinned(pins, { ...NO_PINNED_FILTER, ...f }, storyOf, tagName).map(p => p.storyId);

describe('pinnedFilter', () => {
  it('returns everything when no filter is set', () => {
    expect(pinnedFilterActive(NO_PINNED_FILTER)).toBe(false);
    expect(ids({})).toEqual(['a', 'b', 'c', 'x']);
  });
  it('matches the title or a genre name, ignoring case', () => {
    expect(ids({ query: 'train' })).toEqual(['a']);
    expect(ids({ query: 'ADVENTURE' })).toEqual(['a', 'b']);
  });
  it('filters by length and by genre', () => {
    expect(ids({ duration: 'short' })).toEqual(['a']);
    expect(ids({ duration: 'long' })).toEqual(['c']);
    expect(ids({ tagId: 't2' })).toEqual(['a', 'b']);
  });
  it('combines filters and skips stories that are not loaded', () => {
    expect(ids({ tagId: 't2', duration: 'medium' })).toEqual(['b']);
    expect(ids({ query: 'zzz' })).toEqual([]);
  });
});
