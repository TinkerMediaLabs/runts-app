// Index of the scene showing at `position` seconds: the last scene whose start is at or before it.
// Derived, never stored, so seeking, resuming and bookmarks just work.
export function sceneIndexAt(scenes: { startSeconds: number }[], position: number): number {
  let lo = 0;
  let hi = scenes.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (scenes[mid].startSeconds <= position) { found = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return found;
}
