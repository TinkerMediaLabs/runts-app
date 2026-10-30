import { fmtDuration, formatNarratorDisplay, getDurationDisplay, getSpiceDisplay, isRecentlyPublished } from '../lib/storyDisplay';

describe('fmtDuration', () => {
  it('formats minutes', () => expect(fmtDuration(25 * 60)).toBe('25m'));
  it('formats hours and minutes', () => expect(fmtDuration(95 * 60)).toBe('1h 35m'));
  it('formats whole hours', () => expect(fmtDuration(120 * 60)).toBe('2h'));
  it('is empty for no duration', () => expect(fmtDuration(0)).toBe(''));
});

describe('formatNarratorDisplay', () => {
  it('is empty without narrators', () => expect(formatNarratorDisplay(undefined)).toBe(''));
  it('shows a single narrator', () => expect(formatNarratorDisplay(['Ann'])).toBe('Ann'));
  it('summarises several', () => expect(formatNarratorDisplay(['Ann', 'Bo', 'Cy'])).toBe('Ann & 2 more'));
});

describe('getDurationDisplay', () => {
  it('shows time left for in-progress stories', () =>
    expect(getDurationDisplay(1800, 'in_progress', 600).text).toBe('20m left'));
  it('never shows negative time left', () =>
    expect(getDurationDisplay(600, 'in_progress', 900).text).toBe('Almost done'));
  it('shows the full length when finished', () =>
    expect(getDurationDisplay(1800, 'completed', 1800).text).toBe('30m'));
  it('shows the full length when unstarted', () =>
    expect(getDurationDisplay(1800, 'none', 0).text).toBe('30m'));
});

describe('isRecentlyPublished', () => {
  it('is true for yesterday', () => expect(isRecentlyPublished(new Date(Date.now() - 86400000).toISOString())).toBe(true));
  it('is true four days ago', () => expect(isRecentlyPublished(new Date(Date.now() - 4 * 86400000).toISOString())).toBe(true));
  it('is false after five days', () => expect(isRecentlyPublished(new Date(Date.now() - 6 * 86400000).toISOString())).toBe(false));
  it('is false for missing or invalid dates', () => {
    expect(isRecentlyPublished(undefined)).toBe(false);
    expect(isRecentlyPublished('nope')).toBe(false);
  });
});

describe('getSpiceDisplay', () => {
  it('is empty without a rating', () => expect(getSpiceDisplay(null)).toBe(''));
  it('repeats peppers', () => expect(getSpiceDisplay(3)).toBe('🌶️🌶️🌶️'));
});
