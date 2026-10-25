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
