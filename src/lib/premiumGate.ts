// The one message that means "this story's audio is for Premium members". The audio engine and downloader throw it
// when the server declines to sign a premium file; the player stores it as playError, and PremiumGate (mounted once
// in the app shell) answers it with the Premium bottom sheet instead of the generic "Playback Error" alert.
export const PREMIUM_REQUIRED_MESSAGE = 'This story is for Premium members.';

// Instant path: when the phone already knows a story is premium and the listener is not, the play button asks for
// the sheet straight away, with no network call. PremiumGate (in the app shell) listens and opens it.
type Listener = (storyTitle?: string) => void;
const listeners = new Set<Listener>();

export function onPremiumSheetRequest(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function requestPremiumSheet(storyTitle?: string): void {
  listeners.forEach(fn => fn(storyTitle));
}
