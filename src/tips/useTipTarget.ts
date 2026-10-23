import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { registerTarget, unregisterTarget } from './tipsStore';

// Makes a real control available to the tips system under a name, e.g. useTipTarget('pin-button').
// Put the returned ref on a View that wraps the control (with collapsable={false}). A tip pointing at a
// name that is not on screen is simply skipped, so removing a control never breaks anything.
export function useTipTarget(name?: string | null) {
  const ref = useRef<View>(null);
  useEffect(() => {
    if (!name) return;
    registerTarget(name, ref);
    return () => unregisterTarget(name, ref);
  }, [name]);
  return ref;
}
