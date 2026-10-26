import { DEFAULT_LAYOUT, isSectionActive, resolveHomeLayout, type HomeSectionRow } from '../lib/homeLayout';

const NOW = new Date('2026-10-26T12:00:00Z').getTime();
const row = (over: Partial<HomeSectionRow> & { id: string }): HomeSectionRow => ({ type: 'newStories', sortOrder: 10, ...over });

describe('resolveHomeLayout', () => {
  it('knows the trending type', () => {
    expect(resolveHomeLayout([row({ id: 't', type: 'trending', windowDays: 3 })], NOW).map(r => r.id)).toEqual(['t']);
  });

  it('falls back to the default layout when nothing is saved or loading failed', () => {
    expect(resolveHomeLayout(undefined, NOW)).toEqual(DEFAULT_LAYOUT);
    expect(resolveHomeLayout([], NOW)).toEqual(DEFAULT_LAYOUT);
    expect(resolveHomeLayout(null, NOW)).toEqual(DEFAULT_LAYOUT);
  });

  it('orders sections by sortOrder', () => {
    const out = resolveHomeLayout([row({ id: 'b', sortOrder: 20 }), row({ id: 'a', sortOrder: 5 }), row({ id: 'c', sortOrder: 12 })], NOW);
    expect(out.map(r => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('skips disabled sections but treats a missing flag as on', () => {
    const out = resolveHomeLayout([row({ id: 'off', enabled: false }), row({ id: 'unset', enabled: null }), row({ id: 'on', enabled: true })], NOW);
    expect(out.map(r => r.id).sort()).toEqual(['on', 'unset']);
  });

  it('skips section types this app does not know (forward compatibility)', () => {
    const out = resolveHomeLayout([row({ id: 'x', type: 'trendingV9' }), row({ id: 'y', type: 'handPicked' })], NOW);
    expect(out.map(r => r.id)).toEqual(['y']);
  });

  it('shows an empty Home on purpose when rows exist but none are active', () => {
    expect(resolveHomeLayout([row({ id: 'a', enabled: false })], NOW)).toEqual([]);
  });

  it('ignores empty or null rows', () => {
    expect(resolveHomeLayout([null, row({ id: 'a' })], NOW).map(r => r.id)).toEqual(['a']);
  });

  it('caps the number of sections', () => {
    const many = Array.from({ length: 40 }, (_, i) => row({ id: `s${i}`, sortOrder: i }));
    expect(resolveHomeLayout(many, NOW)).toHaveLength(20);
  });
});

describe('isSectionActive (schedule)', () => {
  it('is off before it starts and on after', () => {
    const r = row({ id: 'a', startsAt: '2026-10-27T00:00:00Z' });
    expect(isSectionActive(r, NOW)).toBe(false);
    expect(isSectionActive(r, new Date('2026-10-27T00:00:01Z').getTime())).toBe(true);
  });

  it('is off once it has ended', () => {
    const r = row({ id: 'a', endsAt: '2026-10-26T12:00:00Z' });
    expect(isSectionActive(r, NOW)).toBe(false);
    expect(isSectionActive(r, NOW - 1)).toBe(true);
  });

  it('is on inside a window and ignores unreadable dates', () => {
    expect(isSectionActive(row({ id: 'a', startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' }), NOW)).toBe(true);
    expect(isSectionActive(row({ id: 'a', startsAt: 'garbage', endsAt: 'nope' }), NOW)).toBe(true);
  });
});
