import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useApp } from '@/context/AppContext';
import { refreshCarPass, clearCarPass, carPassEnabled } from '@/lib/carPass';

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000; // renew daily while the app is used, so the pass never runs out

// Mounted once in AppShell. Gives the player library a fresh car pass on sign-in and when the app comes back.
export function useCarPass() {
  const { isAuthenticated } = useApp();

  useEffect(() => {
    if (!carPassEnabled) return;
    if (!isAuthenticated) { clearCarPass(); return; }

    let last = 0;
    const renew = async (force = false) => {
      if (!force && Date.now() - last < REFRESH_AFTER_MS) return;
      try { await refreshCarPass(); last = Date.now(); } catch (e) { console.warn('[Car] could not renew the car pass', e); }
    };
    renew(true);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') renew(); });
    return () => sub.remove();
  }, [isAuthenticated]);
}
