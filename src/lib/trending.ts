import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

export const TREND_DEFAULT_DAYS = 7;
export const TREND_MIN_STORIES = 3;   // fewer than this recent plays -> not a real "trending" list yet

export function clampWindow(days: number | null | undefined): number {
  const n = Math.round(Number(days ?? TREND_DEFAULT_DAYS));
  return Math.min(7, Math.max(2, Number.isFinite(n) ? n : TREND_DEFAULT_DAYS));
}

// Live, non-erotic stories from the hourly snapshot for the last N days, most played first. Returns []
// when there is no snapshot yet or too little recent play to mean anything.
export async function fetchTrendingSnapshot(windowDays: number, limit: number): Promise<any[]> {
  try {
    const client = generateClient<Schema>();
    const snap: any = await (client.models as any).TrendingSnapshot.get({ id: `d${clampWindow(windowDays)}` });
    const ids = ((snap?.data?.storyIds ?? []) as (string | null)[]).filter(Boolean) as string[];
    if (ids.length === 0) return [];
    const rows = await Promise.all(ids.slice(0, Math.min(30, limit * 2)).map(id => client.models.Story.get({ id })));
    const stories = rows
      .map(r => r.data as any)
      .filter(s => s && s.live === 'true' && s.isErotic !== 'true');
    return stories.length >= TREND_MIN_STORIES ? stories.slice(0, limit) : [];
  } catch {
    return [];
  }
}

// Most-listened of all time: the fallback while a brand-new catalog has no recent plays.
export async function fetchAllTimePopular(limit: number): Promise<any[]> {
  try {
    const client = generateClient<Schema>();
    const res: any = await (client.models.Story as any).listStoryByLiveAndNumListens(
      { live: 'true' }, { sortDirection: 'DESC', limit: Math.min(40, limit * 2) });
    return ((res?.data ?? []) as any[]).filter(s => s.isErotic !== 'true').slice(0, limit);
  } catch {
    return [];
  }
}
