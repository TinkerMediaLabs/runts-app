import { isListened, topTags, newGenreIds, listenedTagIds } from '../lib/taste';

describe('isListened', () => {
  it('counts finished, or at least half played', () => {
    expect(isListened(true, 0, 600)).toBe(true);
    expect(isListened(false, 300, 600)).toBe(true);
    expect(isListened(false, 299, 600)).toBe(false);
  });
  it('needs a known duration', () => {
    expect(isListened(false, 500, 0)).toBe(false);
    expect(isListened(false, 500, null)).toBe(false);
  });
});

describe('topTags', () => {
  const e = (primary: string, weight = 1, secondary?: string, isErotic = 'false') =>
    ({ primaryTagId: primary, secondaryTagId: secondary, isErotic, weight });

  it('ranks the most listened genres first', () => {
    expect(topTags([e('a'), e('b'), e('a'), e('c'), e('a'), e('b')], new Set(), 2)).toEqual(['a', 'b']);
  });
  it('lets recent listening outweigh old listening', () => {
    const recent = Array.from({ length: 6 }, () => e('new'));
    const old = Array.from({ length: 6 }, () => e('old'));
    expect(topTags([...recent, ...old], new Set(), 1)).toEqual(['new']);
  });
  it('counts half-listened stories for less than finished ones', () => {
    expect(topTags([e('half', 0.6), e('done', 1)], new Set(), 1)).toEqual(['done']);
  });
  it('skips excluded genres and erotic stories', () => {
    expect(topTags([e('picked'), e('x', 1, undefined, 'true'), e('other')], new Set(['picked']), 3)).toEqual(['other']);
  });
  it('uses the second genre at a lower weight', () => {
    expect(topTags([e('a', 1, 'b'), e('c')], new Set(), 3)).toEqual(['a', 'c', 'b']);
  });
  it('is empty with no history', () => {
    expect(topTags([], new Set(), 3)).toEqual([]);
  });
});

describe('newGenreIds', () => {
  it('lists genres the listener has not seen', () => {
    expect(newGenreIds(['a', 'b', 'c'], ['a'])).toEqual(['b', 'c']);
    expect(newGenreIds(['a'], ['a', 'z'])).toEqual([]);
  });
});

describe('listenedTagIds', () => {
  it('collects both genres of each story and skips erotic ones', () => {
    const r = listenedTagIds([
      { primaryTagId: 'a', secondaryTagId: 'b', weight: 1 },
      { primaryTagId: 'a', secondaryTagId: 'c', weight: 1 },
      { primaryTagId: 'e', isErotic: 'true', weight: 1 },
    ]);
    expect(r.sort()).toEqual(['a', 'b', 'c']);
  });
});
