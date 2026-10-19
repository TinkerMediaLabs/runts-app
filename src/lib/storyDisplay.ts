// Shared helpers for story card display logic (ForYouCarousel, HorizontalTile,
// StoryDetails, etc.)

export const NEW_STORY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

export function isRecentlyPublished(publishedAt: string | null | undefined): boolean {
  if (!publishedAt) return false;
  const publishedTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTime)) return false;
  return Date.now() - publishedTime < NEW_STORY_WINDOW_MS;
}

// "Jordan Reyes" (single) or "Jordan Reyes & 2 more" (multiple)
export function formatNarratorDisplay(names: string[] | undefined): string {
  if (!names || names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names[0]} & ${names.length - 1} more`;
}

export function fmtDuration(s: number): string {
  if (!s) return '';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export type ProgressStatus = 'none' | 'in_progress' | 'completed';

// Shared progress-aware duration display used by ForYouCarousel,
// HorizontalTile, and StoryDetails — keeps the color/text logic consistent
// everywhere a duration is shown.
export function getDurationDisplay(duration: number, progressStatus: ProgressStatus, progressSeconds: number) {
  if (progressStatus === 'completed') {
    return { text: fmtDuration(duration), color: '#4ADE80', icon: 'check-circle' as const };
  }
  if (progressStatus === 'in_progress') {
    const remaining = Math.max(0, duration - (progressSeconds ?? 0));
    return { text: `${fmtDuration(remaining)} left`, color: 'cyan', icon: 'clock' as const };
  }
  return { text: fmtDuration(duration), color: 'rgba(255,255,255,0.85)', icon: 'clock' as const };
}


// Pepper display for a story's spice rating — number of peppers matches
// the rating (1-5). Returns '' when there's no rating to show.
export function getSpiceDisplay(spiceRating: number | null | undefined): string {
  if (!spiceRating || spiceRating < 1) return '';
  return '🌶️'.repeat(spiceRating);
}
