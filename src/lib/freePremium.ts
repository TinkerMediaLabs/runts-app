// The free Premium offer: while the CMS has an end date set (AppSetting row 'premiumFreeUntil') that has not
// passed, a signed-in person can claim 3 months of Premium once. The server enforces the same rule
// (amplify/functions/claim-free-premium/core.ts); this copy only decides whether to show the button.
// Pure (no React Native imports) so it can be unit tested.

export const FREE_PREMIUM_KEY = 'premiumFreeUntil';

export function offerIsOpen(end: string | null | undefined, now: number = Date.now()): boolean {
  if (!end) return false;
  const t = Date.parse(end);
  return !Number.isNaN(t) && now < t;
}
