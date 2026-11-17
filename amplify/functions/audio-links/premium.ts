// Premium audio on the server. A free signed-in person is not given a signed link to the audio file of a premium
// story. Pure logic (no AWS calls, no network) so it can be unit tested; the handler supplies the real reads.

export const PREMIUM_ENTITLEMENT = 'premium';
export const PREMIUM_TTL_MS = 5 * 60 * 1000;   // how long a person's premium answer is reused

// Only the audio file of a premium story is protected. Covers, previews and author photos stay open to everyone who is signed in.
export const AUDIO_PREFIX = 'stories/audio/';
export const needsPremiumList = (paths: string[]) => paths.some(p => p.startsWith(AUDIO_PREFIX));

// Which of the requested audio files belong to premium stories: the handler looks the requested audio paths up in
// the PremiumAudio table (id = file path) and this keeps the ids that came back.
export function premiumAudioSet(rows: Record<string, unknown>[]): Set<string> {
  const out = new Set<string>();
  for (const r of rows) if (typeof r.id === 'string' && r.id.startsWith(AUDIO_PREFIX)) out.add(r.id);
  return out;
}

/** Splits requested paths into the ones a free person may have and the premium audio they may not. */
export function splitPremiumPaths(paths: string[], premium: Set<string>): { open: string[]; locked: string[] } {
  const open: string[] = []; const locked: string[] = [];
  for (const p of paths) (premium.has(p) ? locked : open).push(p);
  return { open, locked };
}

// RevenueCat's customer answer: the premium entitlement is active when it has no end date (lifetime) or the end date is ahead.
export type Subscriber = { entitlements?: Record<string, { expires_date?: string | null } | undefined> };
export function hasActivePremium(subscriber: Subscriber | null | undefined, now: number): boolean {
  const e = subscriber?.entitlements?.[PREMIUM_ENTITLEMENT];
  if (!e) return false;
  if (e.expires_date == null) return true;
  const end = Date.parse(e.expires_date);
  return !Number.isNaN(end) && end > now;
}

// Asks RevenueCat at most once per person per TTL. A failed lookup throws (nothing is cached), so the caller
// refuses premium audio rather than guess.
export function createPremiumChecker(deps: {
  fetchSubscriber: (userId: string) => Promise<Subscriber>;
  now?: () => number;
  ttlMs?: number;
}) {
  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? PREMIUM_TTL_MS;
  const cache = new Map<string, { at: number; ok: boolean }>();
  return async function isPremium(userId: string): Promise<boolean> {
    const hit = cache.get(userId);
    if (hit && now() - hit.at < ttl) return hit.ok;
    const ok = hasActivePremium(await deps.fetchSubscriber(userId), now());
    if (cache.size > 5000) cache.clear();   // a warm function never grows without limit
    cache.set(userId, { at: now(), ok });
    return ok;
  };
}
