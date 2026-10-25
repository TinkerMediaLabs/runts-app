import { useEffect, useState } from 'react';
import { getDownloadedIds, subscribeDownloaded } from '../lib/offlineStorage';

// True when this story is saved on the device for offline listening. Updates when downloads change.
export function useIsDownloaded(storyId?: string | null): boolean {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!storyId) { setSaved(false); return; }
    let alive = true;
    const check = () => getDownloadedIds().then(ids => { if (alive) setSaved(ids.has(storyId)); }).catch(() => {});
    check();
    const off = subscribeDownloaded(check);
    return () => { alive = false; off(); };
  }, [storyId]);
  return saved;
}
