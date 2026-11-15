import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { askForAccount } from '../lib/requireAccount';

// For things that need an account. Signed-in users: runs the action and returns true. Guests: opens the "Create a
// free account" sheet with the reason (what they were trying to do) and returns false.
//   const requireAccount = useRequireAccount();
//   onPress={() => requireAccount('pin this story', () => pin(story))}
export function useRequireAccount() {
  const { isGuest } = useApp();
  return useCallback((reason: string, action?: () => void): boolean => {
    if (isGuest) {
      askForAccount(reason);
      return false;
    }
    action?.();
    return true;
  }, [isGuest]);
}
