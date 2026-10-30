// Decides whether the story before a car-queue transition finished by itself (the car queue moves on to the
// next story natively, so the app never sees an "Ended" state for it). Progress is sampled every 10s, so
// "near the end" allows for that.
export const ENDED_WITHIN_SECONDS = 25;

export function endedNaturally(position: number | undefined, duration: number | undefined): boolean {
  if (!position || !duration || duration <= 0) return false;
  return position >= duration - ENDED_WITHIN_SECONDS;
}
