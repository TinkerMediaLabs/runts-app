import { useEffect, useState } from 'react';
import { getDownloadStatuses, subscribeDownloaded, type DownloadStatus } from '../lib/offlineStorage';
import { getDownloadProgress, subscribeDownloadProgress } from '../lib/downloadProgress';

export type DownloadState = { status: DownloadStatus | 'none'; progress: number };

// Where a story's download stands: saved, downloading (with 0..1 progress), failed, or not started.
export function useDownloadState(storyId?: string | null): DownloadState {
  const [state, setState] = useState<DownloadState>({ status: 'none', progress: 0 });
  useEffect(() => {
    if (!storyId) { setState({ status: 'none', progress: 0 }); return; }
    let alive = true;
    const check = () => getDownloadStatuses().then(map => {
      if (!alive) return;
      const status = map.get(storyId) ?? 'none';
      const progress = getDownloadProgress(storyId) ?? 0;
      setState(prev => (prev.status === status && prev.progress === progress ? prev : { status, progress }));
    }).catch(() => {});
    check();
    const offA = subscribeDownloaded(check);
    const offB = subscribeDownloadProgress(check);
    return () => { alive = false; offA(); offB(); };
  }, [storyId]);
  return state;
}
