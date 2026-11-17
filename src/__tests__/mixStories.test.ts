import { mixRoundRobin } from '../lib/mixStories';

const mk = (id: string, extra: any = {}) => ({ id, ...extra });

describe('mixRoundRobin', () => {
  it('alternates between lists', () => {
    const out = mixRoundRobin([[mk('a1'), mk('a2')], [mk('b1'), mk('b2')]], 10);
    expect(out.map(s => s.id)).toEqual(['a1', 'b1', 'a2', 'b2']);
  });

  it('removes duplicates across lists', () => {
    const out = mixRoundRobin([[mk('x'), mk('a2')], [mk('x'), mk('b2')]], 10);
    expect(out.map(s => s.id)).toEqual(['x', 'a2', 'b2']);
  });

  it('drops erotic stories and rows without an id', () => {
    const out = mixRoundRobin([[mk('e', { isErotic: 'true' }), { title: 'no id' }, mk('ok')]], 10);
    expect(out.map(s => s.id)).toEqual(['ok']);
  });

  it('stops at the limit', () => {
    const big = Array.from({ length: 50 }, (_, i) => mk(`s${i}`));
    expect(mixRoundRobin([big], 12)).toHaveLength(12);
  });

  it('copes with empty lists', () => expect(mixRoundRobin([[], []], 12)).toEqual([]));

  it('lets a short list not block the others', () => {
    const out = mixRoundRobin([[], [mk('b1'), mk('b2')]], 10);
    expect(out.map(s => s.id)).toEqual(['b1', 'b2']);
  });
});

import { mixWithReasons, reasonText } from '../lib/mixStories';

describe('mixWithReasons', () => {
  const s = (id: string) => ({ id, title: id });
  it('labels each story with the list it came from', () => {
    const out = mixWithReasons([
      { reason: { kind: 'picked', tagId: 't1' }, stories: [s('a')] },
      { reason: { kind: 'new' }, stories: [s('b')] },
    ], 10);
    expect(out.map(x => [x.id, x.reason.kind])).toEqual([['a', 'picked'], ['b', 'new']]);
  });
  it('shows the strongest reason when a story is in several lists', () => {
    const out = mixWithReasons([
      { reason: { kind: 'new' }, stories: [s('a')] },
      { reason: { kind: 'trending' }, stories: [s('a')] },
      { reason: { kind: 'learned', tagId: 'x' }, stories: [s('a')] },
      { reason: { kind: 'picked', tagId: 'y' }, stories: [s('a')] },
    ], 10);
    expect(out).toHaveLength(1);
    expect(out[0].reason).toEqual({ kind: 'picked', tagId: 'y' });
  });
  it('keeps the exclusions and limit of the plain mix', () => {
    const out = mixWithReasons([{ reason: { kind: 'new' }, stories: [s('a'), s('b'), s('c')] }], 2, new Set(['a']));
    expect(out.map(x => x.id)).toEqual(['b', 'c']);
  });
});

describe('reasonText', () => {
  it('words each reason', () => {
    expect(reasonText({ kind: 'picked', tagId: 't' }, 'Mystery')).toBe('Because you like Mystery');
    expect(reasonText({ kind: 'learned', tagId: 't' }, 'Horror')).toBe('Because you listen to Horror');
    expect(reasonText({ kind: 'mood', tagId: 't' }, 'Dark and scary')).toBe('Matches Dark and scary');
    expect(reasonText({ kind: 'trending' })).toBe('Trending this week');
    expect(reasonText({ kind: 'new' }, undefined, true)).toBe('New this week');
    expect(reasonText({ kind: 'new' }, undefined, false)).toBe('Recently added');
  });
  it('says nothing when the genre name is missing or there is no reason', () => {
    expect(reasonText({ kind: 'picked', tagId: 't' })).toBe('');
    expect(reasonText(undefined)).toBe('');
  });

  it('says why a followed genre story is here, ranked between picked and learned', () => {
    expect(reasonText({ kind: 'followed', tagId: 't' }, 'Mystery')).toBe('Because you follow Mystery');
    expect(reasonText({ kind: 'followed', tagId: 't' })).toBe('');
    const out = mixWithReasons([
      { reason: { kind: 'learned', tagId: 'l' }, stories: [mk('a')] },
      { reason: { kind: 'followed', tagId: 'f' }, stories: [mk('a')] },
      { reason: { kind: 'new' }, stories: [mk('a')] },
    ], 10);
    expect(out[0].reason.kind).toBe('followed');
    const picked = mixWithReasons([
      { reason: { kind: 'followed', tagId: 'f' }, stories: [mk('b')] },
      { reason: { kind: 'picked', tagId: 'p' }, stories: [mk('b')] },
    ], 10);
    expect(picked[0].reason.kind).toBe('picked');
  });
});
