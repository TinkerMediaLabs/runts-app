import { resolveDiscoverLayout, DEFAULT_DISCOVER_LAYOUT } from '../lib/discoverLayout';
import { pickPopular, weightedSample, letterOf, groupByLetter, interleaveRelated, pickTryNew, type ListedTag } from '../lib/discoverTags';

const NOW = Date.parse('2026-10-27T12:00:00Z');
const t = (id: string, liveCount: number, listens7?: number, at?: string): ListedTag =>
  ({ id, name: id, liveCount, listens7: listens7 ?? null, listens7At: at ?? null });
const fresh = '2026-10-27T11:00:00Z';
const old = '2026-10-20T11:00:00Z';

describe('resolveDiscoverLayout', () => {
  it('uses the default when nothing is set up', () => {
    expect(resolveDiscoverLayout([], NOW)).toBe(DEFAULT_DISCOVER_LAYOUT);
    expect(resolveDiscoverLayout(undefined, NOW)).toBe(DEFAULT_DISCOVER_LAYOUT);
  });
  it('orders rows, drops disabled, unknown and out-of-schedule ones', () => {
    const rows = [
      { id: 'b', type: 'discoverPopular', sortOrder: 20 },
      { id: 'a', type: 'discoverGenres', sortOrder: 10 },
      { id: 'c', type: 'discoverShuffle', sortOrder: 30, enabled: false },
      { id: 'd', type: 'forYou', sortOrder: 5 },
      { id: 'e', type: 'discoverCatalog', sortOrder: 40, endsAt: '2026-10-01T00:00:00Z' },
    ];
    expect(resolveDiscoverLayout(rows, NOW).map(r => r.id)).toEqual(['a', 'b']);
  });
  it('rows that exist but are all off mean an empty list on purpose', () => {
    expect(resolveDiscoverLayout([{ id: 'a', type: 'discoverGenres', sortOrder: 1, enabled: false }], NOW)).toEqual([]);
  });
});

describe('pickPopular', () => {
  it('ranks by recent listening', () => {
    const r = pickPopular([t('a', 5, 10, fresh), t('b', 5, 30, fresh), t('c', 5, 20, fresh)], [], NOW, 2);
    expect(r.map(x => x.id)).toEqual(['b', 'c']);
  });
  it('ignores stale or zero listening numbers and fills from the biggest subgenres', () => {
    const r = pickPopular([t('a', 5, 99, old), t('z', 5, 0, fresh)], [t('x', 3), t('y', 9), t('a', 5)], NOW, 3);
    expect(r.map(x => x.id)).toEqual(['y', 'a', 'x']);
  });
  it('does not repeat a subgenre that is in both lists', () => {
    const r = pickPopular([t('a', 5, 10, fresh)], [t('a', 5), t('b', 4)], NOW, 5);
    expect(r.map(x => x.id)).toEqual(['a', 'b']);
  });
  it('returns fewer when there are not enough', () => {
    expect(pickPopular([], [t('a', 1)], NOW, 5)).toHaveLength(1);
  });
});

describe('weightedSample', () => {
  const items = [{ id: 'a', w: 1 }, { id: 'b', w: 1 }, { id: 'c', w: 1 }];
  it('returns n distinct items', () => {
    const r = weightedSample(items, 2, x => x.w);
    expect(new Set(r.map(x => x.id)).size).toBe(2);
  });
  it('returns everything when n is larger than the list', () => {
    expect(weightedSample(items, 10, x => x.w)).toHaveLength(3);
  });
  it('favours heavier items', () => {
    const heavy = [{ id: 'big', w: 1000 }, { id: 'small', w: 1 }];
    let big = 0;
    for (let i = 0; i < 200; i++) if (weightedSample(heavy, 1, x => x.w)[0].id === 'big') big++;
    expect(big).toBeGreaterThan(180);
  });
  it('is deterministic with a fixed random source', () => {
    expect(weightedSample(items, 1, x => x.w, () => 0)[0].id).toBe('a');
    expect(weightedSample(items, 1, x => x.w, () => 0.99)[0].id).toBe('c');
  });
});

describe('A-Z sections', () => {
  it('finds the section letter, ignoring accents and symbols', () => {
    expect(letterOf('Élan')).toBe('E');
    expect(letterOf('  zombies')).toBe('Z');
    expect(letterOf('1984')).toBe('#');
    expect(letterOf('')).toBe('#');
  });
  it('groups by letter with # last', () => {
    const g = groupByLetter([{ name: '1984' }, { name: 'Alien' }, { name: 'Aliens' }, { name: 'Zombies' }]);
    expect(g.map(s => s.letter)).toEqual(['A', 'Z', '#']);
    expect(g[0].data).toHaveLength(2);
  });
});

describe('interleaveRelated', () => {
  it('takes in turn from each genre without repeats', () => {
    const r = interleaveRelated([['a', 'b', 'c'], ['d', 'a', 'e']], new Set(), new Set(), 10);
    expect(r).toEqual(['a', 'd', 'b', 'c', 'e']);
  });
  it('leaves out the listener genres and excluded ids, and stops at max', () => {
    const r = interleaveRelated([['own', 'a', 'x', 'b'], ['c', 'd']], new Set(['own']), new Set(['x']), 3);
    expect(r).toEqual(['c', 'a', 'd']);
  });
  it('handles no genres', () => {
    expect(interleaveRelated([], new Set(), new Set(), 5)).toEqual([]);
  });
});

describe('pickTryNew', () => {
  it('skips listened and picked subgenres', () => {
    const r = pickTryNew([t('a', 1), t('b', 1), t('c', 1), t('d', 1)], ['a'], ['c'], 5);
    expect(r.map(x => x.id)).toEqual(['b', 'd']);
  });
  it('respects the limit', () => {
    expect(pickTryNew([t('a', 1), t('b', 1)], [], [], 1)).toHaveLength(1);
  });
});
