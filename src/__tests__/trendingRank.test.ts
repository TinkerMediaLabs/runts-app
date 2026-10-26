import { rankWindow, lastDays } from '../../amplify/functions/trending-snapshot/rank';

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
