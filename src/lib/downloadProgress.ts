// Live progress (0..1) of downloads in flight, shared so tiles can show it without reading storage.
const progress = new Map<string, number>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function setDownloadProgress(storyId: string, fraction: number) {
  const next = Math.max(0, Math.min(1, fraction));
  const prev = progress.get(storyId);
  // Only notify when the whole-percent value moves, so a fast download does not flood the UI.
  if (prev !== undefined && Math.floor(prev * 100) === Math.floor(next * 100)) return;
  progress.set(storyId, next);
  emit();
}

export function clearDownloadProgress(storyId: string) {
  if (progress.delete(storyId)) emit();
}

export function getDownloadProgress(storyId: string): number | undefined {
  return progress.get(storyId);
}

export function subscribeDownloadProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
