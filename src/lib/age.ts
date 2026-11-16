// Age rules for sign-up. Pure (no React Native imports) so they can be unit tested.

// Runts is not for children: accounts need an owner who is at least this old (matches the privacy policy).
export const MIN_AGE = 13;
// The mature section needs an adult.
export const ADULT_AGE = 18;

// Whole years between a birthdate (yyyy-MM-dd or a Date) and today, counting birthdays properly.
// Returns null when the birthdate cannot be read.
export function ageOn(birthdate: string | Date | null | undefined, today: Date = new Date()): number | null {
  if (!birthdate) return null;
  const parts = typeof birthdate === 'string' ? birthdate.slice(0, 10).split('-').map(Number) : null;
  const y = parts ? parts[0] : birthdate.getFullYear();
  const m = parts ? parts[1] : birthdate.getMonth() + 1;
  const d = parts ? parts[2] : birthdate.getDate();
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
