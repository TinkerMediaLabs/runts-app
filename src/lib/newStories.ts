// "New stories" on a followed tag: its newest live story is newer than the last time the person opened the tag
// (or, if they never have, newer than when they followed it, so following never lights up old stories).
export function hasNewStories(
  latestStoryAt: string | null | undefined,
  lastSeenAt: string | null | undefined,
  followedAt: string | null | undefined,
): boolean {
  const latest = Date.parse(latestStoryAt ?? '');
  if (!Number.isFinite(latest)) return false;
  const seen = Date.parse(lastSeenAt ?? followedAt ?? '');
  if (!Number.isFinite(seen)) return false;
  return latest > seen;
}
