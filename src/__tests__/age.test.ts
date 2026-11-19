import { ageOn, isOldEnough, isAdult, ageFromEntry, userAge, parseAgeInput, isOldEnoughAge, isAdultAge } from '../lib/age';

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

describe('age given at sign-up', () => {
  it('parses a typed age', () => {
    expect(parseAgeInput('34')).toBe(34);
    expect(parseAgeInput(' 18 ')).toBe(18);
    expect(parseAgeInput('0')).toBeNull();
    expect(parseAgeInput('121')).toBeNull();
    expect(parseAgeInput('abc')).toBeNull();
    expect(parseAgeInput('')).toBeNull();
    expect(parseAgeInput('12.5')).toBeNull();
  });
  it('counts forward in whole years only', () => {
    expect(ageFromEntry(17, '2026-11-16', today)).toBe(17);
    expect(ageFromEntry(17, '2025-11-17', today)).toBe(17);   // not a full year yet
    expect(ageFromEntry(17, '2025-11-16', today)).toBe(18);
    expect(ageFromEntry(17, '2023-01-01', today)).toBe(20);
    expect(ageFromEntry(null, '2025-11-16', today)).toBeNull();
  });
  it('prefers a birthdate when the account has one', () => {
    expect(userAge({ birthdate: '2000-01-01', age: 5, ageEnteredOn: '2026-01-01' }, today)).toBe(26);
    expect(userAge({ age: 30, ageEnteredOn: '2025-11-16' }, today)).toBe(31);
    expect(userAge({}, today)).toBeNull();
    expect(userAge(null, today)).toBeNull();
  });
  it('applies the same minimums', () => {
    expect(isOldEnoughAge(12)).toBe(false);
    expect(isOldEnoughAge(13)).toBe(true);
    expect(isAdultAge(17)).toBe(false);
    expect(isAdultAge(18)).toBe(true);
    expect(isAdultAge(null)).toBe(false);
  });
});
