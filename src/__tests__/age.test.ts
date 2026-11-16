import { ageOn, isOldEnough, isAdult } from '../lib/age';

const today = new Date(2026, 10, 16); // 16 Nov 2026

describe('ageOn', () => {
  it('counts birthdays properly', () => {
    expect(ageOn('2013-11-16', today)).toBe(13);   // birthday today
    expect(ageOn('2013-11-17', today)).toBe(12);   // birthday tomorrow
    expect(ageOn('2013-11-15', today)).toBe(13);
    expect(ageOn('2008-12-31', today)).toBe(17);
  });
  it('accepts a Date', () => {
    expect(ageOn(new Date(2000, 0, 1), today)).toBe(26);
  });
  it('returns null for missing or unreadable input', () => {
    expect(ageOn(null, today)).toBeNull();
    expect(ageOn('', today)).toBeNull();
    expect(ageOn('not-a-date', today)).toBeNull();
    expect(ageOn('2000-13-40', today)).toBeNull();
  });
});

describe('minimum ages', () => {
  it('requires 13 to sign up', () => {
    expect(isOldEnough('2013-11-16', today)).toBe(true);
    expect(isOldEnough('2013-11-17', today)).toBe(false);
    expect(isOldEnough('2026-11-16', today)).toBe(false);   // the picker default (today)
    expect(isOldEnough(null, today)).toBe(false);
  });
  it('requires 18 for the mature section', () => {
    expect(isAdult('2008-11-16', today)).toBe(true);
    expect(isAdult('2008-11-17', today)).toBe(false);
  });
});
