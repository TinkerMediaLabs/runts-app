// The thing a guest was trying to do when the "Create a free account" sheet opened, kept so it can be done for them
// right after they sign in or sign up (pin the story, follow the author, land back on the story...). Pure (no React,
// no AWS), so it can be unit tested. Kept in memory only: it lasts as long as the app session, and a stale one (the
// person wandered off and signed in much later) is dropped after PENDING_MINUTES.
export type PendingAction =
  | { kind: 'pin'; id: string }       // pin the story, then open it
  | { kind: 'follow'; id: string }    // follow the author, then open the author
  | { kind: 'story'; id: string }     // open the story (they wanted to listen, rate or discuss it)
  | { kind: 'profile' };              // open their profile

export const PENDING_MINUTES = 30;
let pending: { action: PendingAction; at: number } | null = null;

export function setPendingAction(action: PendingAction | undefined, now: number = Date.now()): void {
  pending = action ? { action, at: now } : null;
}

export function clearPendingAction(): void { pending = null; }

// Returns the waiting action once and forgets it; null when there is none or it is too old.
export function takePendingAction(now: number = Date.now()): PendingAction | null {
  const p = pending;
  pending = null;
  if (!p || now - p.at > PENDING_MINUTES * 60 * 1000) return null;
  return p.action;
}

export const hasPendingAction = (now: number = Date.now()) => !!pending && now - pending.at <= PENDING_MINUTES * 60 * 1000;
