import { rankWindow, rankByTag, lastDays } from '../../amplify/functions/trending-snapshot/rank';

const day = (o: Record<string, number>) => new Map(Object.entries(o));

describe('rankWindow', () => {
  const days = [day({ a: 5, b: 1 }), day({ a: 1, c: 9 }), day({ c: 3, d: 2 })];   // today, yesterday, 2 days ago

  it('sums only the newest N days', () => {
    expect(rankWindow(days, 2).map(r => [r.storyId, r.count])).toEqual([['c', 9], ['a', 6], ['b', 1]]);
    expect(rankWindow(days, 3).map(r => [r.storyId, r.count])).toEqual([['c', 12], ['a', 6], ['d', 2], ['b', 1]]);
  });

  it('keeps only the top N and breaks ties by id so the order is stable', () => {
    const tied = [day({ z: 4, y: 4, x: 4, w: 1 })];
    expect(rankWindow(tied, 7, 3).map(r => r.storyId)).toEqual(['x', 'y', 'z']);
  });

  it('is empty when there were no plays', () => {
    expect(rankWindow([], 7)).toEqual([]);
    expect(rankWindow([day({ a: 0 })], 7)).toEqual([]);
  });
});

describe('lastDays', () => {
  it('lists UTC dates newest first', () => {
    expect(lastDays(3, new Date('2026-10-26T01:00:00Z').getTime())).toEqual(['2026-10-26', '2026-10-25', '2026-10-24']);
  });
});

describe('rankByTag', () => {
  const tagsOf = new Map([['a', ['scifi']], ['b', ['scifi', 'horror']], ['c', ['horror']], ['d', []]]);
  const days = [day({ a: 5, b: 2, d: 9 }), day({ c: 4, b: 1 })];

  it('ranks stories inside each genre by plays', () => {
    const r = rankByTag(days, tagsOf, 7);
    expect(r.get('scifi')!.map(x => [x.storyId, x.count])).toEqual([['a', 5], ['b', 3]]);
    expect(r.get('horror')!.map(x => [x.storyId, x.count])).toEqual([['c', 4], ['b', 3]]);
  });
  it('ignores stories with no known genre and respects the window', () => {
    const r = rankByTag(days, tagsOf, 1);
    expect(r.has('d')).toBe(false);
    expect(r.get('horror')!.map(x => x.storyId)).toEqual(['b']);
  });
  it('keeps only the top N', () => {
    const many = [day({ a: 3, b: 2, c: 1 })];
    const all = new Map([['a', ['t']], ['b', ['t']], ['c', ['t']]]);
    expect(rankByTag(many, all, 7, 2).get('t')!.map(x => x.storyId)).toEqual(['a', 'b']);
  });
});
