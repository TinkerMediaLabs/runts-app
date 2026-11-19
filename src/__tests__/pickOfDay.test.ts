import { pickIndexForDay, pickCardHeight } from '../lib/pickOfDay';

describe('pickIndexForDay', () => {
  it('is 0 for an empty or single list', () => {
    expect(pickIndexForDay(0)).toBe(0);
    expect(pickIndexForDay(1, new Date(2026, 10, 19))).toBe(0);
  });
  it('is the same all day and stays inside the list', () => {
    const morning = new Date(2026, 10, 19, 6, 0);
    const night = new Date(2026, 10, 19, 23, 30);
    expect(pickIndexForDay(5, morning)).toBe(pickIndexForDay(5, night));
    expect(pickIndexForDay(5, morning)).toBeGreaterThanOrEqual(0);
    expect(pickIndexForDay(5, morning)).toBeLessThan(5);
  });
  it('moves to the next entry the next day and wraps around', () => {
    const a = pickIndexForDay(3, new Date(2026, 10, 19));
    const b = pickIndexForDay(3, new Date(2026, 10, 20));
    const c = pickIndexForDay(3, new Date(2026, 10, 21));
    const d = pickIndexForDay(3, new Date(2026, 10, 22));
    expect(b).toBe((a + 1) % 3);
    expect(c).toBe((b + 1) % 3);
    expect(d).toBe(a);
  });
});

describe('pickCardHeight', () => {
  it('keeps the tile shape (200 by 240) at any width', () => {
    expect(pickCardHeight(200)).toBe(240);
    expect(pickCardHeight(354)).toBe(425);
    expect(pickCardHeight(100)).toBe(120);
  });
});
