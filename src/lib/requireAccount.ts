// Tiny event channel for the "Create a free account" sheet a guest sees when they tap something that needs an
// account (the profile, pinning a story, a full-length play...). Works from anywhere without a provider, like the
// chip: the <GuestSheet /> mounted in AppShell listens for it.
type Listener = (reason: string) => void;
const listeners = new Set<Listener>();

export function askForAccount(reason: string): void {
  listeners.forEach(l => l(reason));
}

export function subscribeAccountPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
