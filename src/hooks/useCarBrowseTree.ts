import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import TrackPlayer from '@rntp/player';
import { useApp } from '@/context/AppContext';
import { queryClient } from '@/lib/queryClient';
import { loadCarStories } from '@/lib/carLibrary';
import { buildCarBrowseTree } from '@/features/audio/carBrowseTree';

// Keeps the car list in step with who is signed in and what they are listening to. Mounted once in AppShell.
// Refreshes: sign-in/out and plan change, app returning to the foreground, and (after a short pause) whenever
// the pinned or in-progress lists change. A failed refresh keeps the previous list; it never blanks the car.
const WATCHED = new Set(['pinnedStories', 'inProgressStories', 'isPinned']);
const DEBOUNCE_MS = 4000;

export function useCarBrowseTree() {
  const { isAuthenticated, isPremium } = useApp();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return; // CarPlay comes later, with the iPhone work

    const push = (tree: ReturnType<typeof buildCarBrowseTree>) => {
      try { TrackPlayer.setBrowseTree(tree); } catch (e) { console.warn('[Car] could not update the browse tree', e); }
    };

    if (!isAuthenticated) {
      push(buildCarBrowseTree({ signedIn: false }));
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const lists = await loadCarStories({ isPremium: !!isPremium });
        if (!cancelled) push(buildCarBrowseTree({ signedIn: true, ...lists }));
      } catch (e) {
        console.warn('[Car] refresh failed, keeping the previous list', e);
      } finally {
        running.current = false;
      }
    };
    const later = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, DEBOUNCE_MS);
    };

    refresh();
    const unsubscribeCache = queryClient.getQueryCache().subscribe(e => {
      if (e.type === 'updated' && WATCHED.has(String(e.query.queryKey[0]))) later();
    });
    const appState = AppState.addEventListener('change', s => { if (s === 'active') later(); });

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      unsubscribeCache();
      appState.remove();
    };
  }, [isAuthenticated, isPremium]);
}
