import { tipIsEligible } from '../tips/tipRules';
import type { Tip } from '../tips/tips';

const tip = (extra: Partial<Tip> = {}): Tip => ({
  id: 'search', target: 'search-bar', routes: ['HomeScreen'], title: 't', body: 'b', order: 10, ...extra,
});
const ctx = (extra: any = {}) => ({ seen: [] as string[], route: 'HomeScreen', flags: {}, hasTarget: true, ...extra });

describe('tipIsEligible', () => {
  it('shows on the right screen when the control is registered', () => {
    expect(tipIsEligible(tip(), ctx())).toBe(true);
  });
  it('does not show once the user has moved to another screen (the Search screen bug)', () => {
    expect(tipIsEligible(tip(), ctx({ route: 'SearchScreen' }))).toBe(false);
  });
  it('does not show when the control is not registered (screen blurred or covered)', () => {
    expect(tipIsEligible(tip(), ctx({ hasTarget: false }))).toBe(false);
  });
  it('does not show without a route yet', () => {
    expect(tipIsEligible(tip(), ctx({ route: null }))).toBe(false);
    expect(tipIsEligible(tip(), ctx({ route: undefined }))).toBe(false);
  });
  it('does not show a tip already seen', () => {
    expect(tipIsEligible(tip(), ctx({ seen: ['search'] }))).toBe(false);
  });
  it('needs its context flag when it has one', () => {
    const t = tip({ needs: 'playerExpanded' });
    expect(tipIsEligible(t, ctx({ flags: {} }))).toBe(false);
    expect(tipIsEligible(t, ctx({ flags: { playerExpanded: false } }))).toBe(false);
    expect(tipIsEligible(t, ctx({ flags: { playerExpanded: true } }))).toBe(true);
  });
  it('allows any of several routes', () => {
    const t = tip({ routes: ['HomeScreen', 'StoryScreen'] });
    expect(tipIsEligible(t, ctx({ route: 'StoryScreen' }))).toBe(true);
    expect(tipIsEligible(t, ctx({ route: 'DiscoverScreen' }))).toBe(false);
  });
});
