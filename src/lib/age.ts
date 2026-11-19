// Age rules for sign-up. Pure (no React Native imports) so they can be unit tested.

// Runts is not for children: accounts need an owner who is at least this old (matches the privacy policy).
export const MIN_AGE = 13;
// The mature section needs an adult.
export const ADULT_AGE = 18;

// Whole years between a birthdate (yyyy-MM-dd or a Date) and today, counting birthdays properly.
// Returns null when the birthdate cannot be read.
export function ageOn(birthdate: string | Date | null | undefined, today: Date = new Date()): number | null {
  if (!birthdate) return null;
  let y: number, m: number, d: number;
  if (typeof birthdate === 'string') {
    [y, m, d] = birthdate.slice(0, 10).split('-').map(Number);
  } else {
    y = birthdate.getFullYear();
    m = birthdate.getMonth() + 1;
    d = birthdate.getDate();
  }
  if (!y || !m || !d || m > 12 || d > 31) return null;
  let age = today.getFullYear() - y;
  const hadBirthday = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function isOldEnough(birthdate: string | Date | null | undefined, today: Date = new Date()): boolean {
  const age = ageOn(birthdate, today);
  return age !== null && age >= MIN_AGE;
}

export function isAdult(birthdate: string | Date | null | undefined, today: Date = new Date()): boolean {
  const age = ageOn(birthdate, today);
  return age !== null && age >= ADULT_AGE;
}

// ── Age given directly (new accounts) ───────────────────────────────────────
// New accounts give an age, not a birthdate. The age is kept with the day it was given and counted forward in whole
// years from that day. Without a birthday this can only lag the real age, never run ahead of it, so it never lets
// anyone into the mature section early.

// Whole years between two days (yyyy-MM-dd or a Date), counting whole years only. Null when unreadable or in the future.
function wholeYearsSince(from: string | Date, today: Date): number | null {
  const y = ageOn(from, today);
  return y !== null && y >= 0 ? y : null;
}

export function ageFromEntry(age: number | null | undefined, enteredOn: string | Date | null | undefined, today: Date = new Date()): number | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 0) return null;
  if (!enteredOn) return age;
  const years = wholeYearsSince(enteredOn, today);
  return age + (years ?? 0);
}

export type AgeSource = { birthdate?: string | null; age?: number | null; ageEnteredOn?: string | null };

// The person's age now, from whichever the account has: a birthdate (older accounts) or an age given at sign-up.
export function userAge(src: AgeSource | null | undefined, today: Date = new Date()): number | null {
  if (!src) return null;
  if (src.birthdate) return ageOn(src.birthdate, today);
  return ageFromEntry(src.age, src.ageEnteredOn, today);
}

// What a typed age may be at sign-up.
export const MAX_AGE_INPUT = 120;
export function parseAgeInput(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= MAX_AGE_INPUT ? n : null;
}
export const isOldEnoughAge = (age: number | null | undefined) => typeof age === 'number' && age >= MIN_AGE;
export const isAdultAge = (age: number | null | undefined) => typeof age === 'number' && age >= ADULT_AGE;
