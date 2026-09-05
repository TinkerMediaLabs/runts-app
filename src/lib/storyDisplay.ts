// Shared helpers for story card display logic (ForYouCarousel, HorizontalTile, etc.)

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
