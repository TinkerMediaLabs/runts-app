import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

// Live connection state (the same signal the data layer uses, fed by NetInfo in lib/queryClient).
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    cb => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
