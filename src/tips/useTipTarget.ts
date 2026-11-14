import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { registerTarget, unregisterTarget } from './tipsStore';

// True while the screen this component lives on is focused. Components outside any screen (the player widgets)
// have no navigation context and count as always focused.
function useScreenFocused(): boolean {
  const nav = useContext(NavigationContext);
  return useSyncExternalStore(
    cb => {
      if (!nav) return () => {};
      const a = nav.addListener('focus', cb);
      const b = nav.addListener('blur', cb);
      return () => { a(); b(); };
    },
    () => (nav ? nav.isFocused() : true),
    () => true,
  );
}

// Makes a real control available to the tips system under a name, e.g. useTipTarget('pin-button').
// Put the returned ref on a View that wraps the control (with collapsable={false}). A tip pointing at a
// name that is not on screen is simply skipped, so removing a control never breaks anything.
// The control is registered only while its screen is focused: a screen pushed on top (Search over Home)
// removes it at once, so a tip can never be drawn over the next screen.
export function useTipTarget(name?: string | null) {
  const ref = useRef<View>(null);
  const focused = useScreenFocused();
  useEffect(() => {
    if (!name || !focused) return;
    registerTarget(name, ref);
    return () => unregisterTarget(name, ref);
  }, [name, focused]);
  return ref;
}
