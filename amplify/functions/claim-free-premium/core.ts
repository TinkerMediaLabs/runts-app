// The free Premium offer: each signed-in person can claim 3 months of Premium once, while the offer is open.
//
// The claim is recorded FIRST, with a "only if not already there" write, so two taps (or two phones) at the same
// moment cannot both get through. Then Premium is granted. If the grant fails, the record is removed again so
// the person can simply try again. The offer is closed unless the CMS has set an end date that has not passed.
export type ClaimResult = 'granted' | 'already_claimed' | 'offer_closed';

export type Deps = {
  offerEnd: () => Promise<string | null>;                          // the AppSetting 'premiumFreeUntil' value, if any
  markClaimed: (userId: string, atIso: string) => Promise<boolean>; // false when this person already claimed
  unmarkClaimed: (userId: string) => Promise<void>;
  grant: (userId: string, endMs: number) => Promise<void>;          // gives the premium entitlement until endMs
  now?: () => number;
};

export type Identity = { sub?: string } | null | undefined;

// Three calendar months from a moment, in UTC (31 Dec becomes 31 Mar; 30 Nov becomes 28/29 Feb).
export function threeMonthsFrom(nowMs: number): number {
  const d = new Date(nowMs);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 3);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.getTime();
}

export function offerIsOpen(end: string | null | undefined, nowMs: number): boolean {
  if (!end) return false;
  const t = Date.parse(end);
  return !Number.isNaN(t) && nowMs < t;
}

export async function claimFreePremium(identity: Identity, deps: Deps): Promise<ClaimResult> {
  const userId = identity?.sub;
  if (!userId) throw new Error('Not signed in.');
  const now = (deps.now ?? Date.now)();
  if (!offerIsOpen(await deps.offerEnd(), now)) return 'offer_closed';
  if (!(await deps.markClaimed(userId, new Date(now).toISOString()))) return 'already_claimed';
  try {
    await deps.grant(userId, threeMonthsFrom(now));
  } catch (e) {
    await deps.unmarkClaimed(userId);
    throw e;
  }
  return 'granted';
}
