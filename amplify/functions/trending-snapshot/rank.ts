// Pure ranking for Trending, kept free of AWS imports so it can be unit tested.

export const MIN_WINDOW = 2;
export const MAX_WINDOW = 7;
export const TOP_N = 20;

export type DayCounts = Map<string, number>;   // storyId -> plays that day

// `days` is newest first: days[0] is today. Window N sums the newest N entries.
export function rankWindow(days: DayCounts[], windowDays: number, topN: number = TOP_N): { storyId: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const day of days.slice(0, windowDays)) {
    for (const [storyId, count] of day) totals.set(storyId, (totals.get(storyId) ?? 0) + count);
  }
  return Array.from(totals, ([storyId, count]) => ({ storyId, count }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count || (a.storyId < b.storyId ? -1 : 1))
    .slice(0, topN);
}

// YYYY-MM-DD (UTC) for today and the days before it, newest first.
export function lastDays(count: number, now: number = Date.now()): string[] {
  return Array.from({ length: count }, (_, i) => new Date(now - i * 86400000).toISOString().slice(0, 10));
}
