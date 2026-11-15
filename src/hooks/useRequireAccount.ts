import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { askForAccount } from '../lib/requireAccount';
import type { PendingAction } from '../lib/pendingAction';

// For things that need an account. Signed-in users: runs the action and returns true. Guests: opens the "Create a
// free account" sheet with the reason (what they were trying to do) and returns false.
//   const requireAccount = useRequireAccount();
//   onPress={() => requireAccount('pin this story', () => pin(story), { kind: 'pin', id: story.id })}
// The optional third argument is what to do for a guest right after they sign in (see pendingAction.ts).
export function useRequireAccount() {
  const { isGuest } = useApp();
  return useCallback((reason: string, action?: () => void, afterSignIn?: PendingAction): boolean => {
    if (isGuest) {
      askForAccount(reason, afterSignIn);
      return false;
    }
    action?.();
    return true;
  }, [isGuest]);
}
