// Length bands for the daily-mood queries. A band is a story's duration in 15-minute steps (0 = under 15 minutes,
// 1 = 15 to 30, 2 = 30 to 45, ...). Each StoryTag row carries its story's band, and `liveTagBand` = "<tagId>#<band>"
// while the story is live, so "live stories of this tag in these length bands, newest first" is an exact indexed
// query at any catalog size. Length cutoffs in the CMS therefore move in 15-minute steps.
export const BAND_SECONDS = 900;

// The band for a duration in seconds, or undefined when the duration is missing or not a positive number.
export function bandOf(duration: unknown): number | undefined {
  const d = typeof duration === 'number' ? duration : Number(duration);
  if (duration === null || duration === undefined || duration === '' || !Number.isFinite(d) || d <= 0) return undefined;
  return Math.floor(d / BAND_SECONDS);
}

// "<tagId>#<band>" while live and the band is known; otherwise undefined (the attribute is then removed, keeping
// the index sparse).
export function liveTagBandOf(tagId: string | undefined, live: boolean, band: number | undefined): string | undefined {
  return live && tagId && band !== undefined ? `${tagId}#${band}` : undefined;
}
