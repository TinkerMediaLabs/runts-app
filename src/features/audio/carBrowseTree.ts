import type { BrowseCategory, BrowseItem } from '@rntp/player';

// What the car screen (Android Auto, later CarPlay) shows. The library keeps this list on the phone and serves it
// even when the app is closed, so it is rebuilt whenever the person, their plan or their lists change.
// Rules: short lists, nothing mature, nothing the person cannot play, never one person's library for the next.

export type CarStory = {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;      // signed CDN link (7 days)
  artworkUrl?: string;
  duration?: number;     // seconds
  startSeconds?: number; // where to resume (see resumePoint)
};

export type CarTreeInput = {
  signedIn: boolean;
  continueListening?: CarStory[];
  playlist?: CarStory[];
  trending?: CarStory[];
};

export const MAX_CONTINUE = 20;
export const MAX_PLAYLIST = 30;
export const MAX_TRENDING = 20;

export type CarFolder = 'continue' | 'playlist' | 'trending';

// Folder prefix keeps ids unique when one story is in both folders.
export const carMediaId = (folder: CarFolder, storyId: string) => `${folder}:${storyId}`;
export const storyIdFromMediaId = (mediaId: string): string | null => {
  const m = /^(continue|playlist|trending):(.+)$/.exec(mediaId);
  return m ? m[2] : null;
};

// Resume only when it is useful: not the first few seconds, and not a story that is effectively finished.
export const MIN_RESUME_SECONDS = 5;
export const NEAR_END_SECONDS = 15;
export function resumePoint(progressSeconds?: number | null, durationSeconds?: number | null): number | undefined {
  if (!progressSeconds || progressSeconds < MIN_RESUME_SECONDS) return undefined;
  if (durationSeconds && progressSeconds >= durationSeconds - NEAR_END_SECONDS) return undefined;
  return Math.floor(progressSeconds);
}

// startPositionSeconds is read by our patch of the player library (patches/@rntp+player+5.0.0.patch).
const toItem = (folder: CarFolder) => (s: CarStory): BrowseItem => {
  const item: BrowseItem & { startPositionSeconds?: number } = {
    mediaId: carMediaId(folder, s.id),
    title: s.title,
    artist: s.artist,
    artworkUrl: s.artworkUrl,
    url: s.audioUrl,
    duration: s.duration,
  };
  if (s.startSeconds) item.startPositionSeconds = s.startSeconds;
  return item;
};

const note = (mediaId: string, title: string): BrowseCategory => ({
  mediaId: `${mediaId}-folder`,
  title: 'Runts',
  items: [{ mediaId, title }],
});

export function buildCarBrowseTree({ signedIn, continueListening = [], playlist = [], trending = [] }: CarTreeInput): BrowseCategory[] {
  if (!signedIn) {
    // Never show one person's library to the next person in the car, and never leave a dead end.
    return [note('signed-out-note', 'Open Runts on your phone to sign in')];
  }

  const seenIds = new Set<string>();
  const usable = (list: CarStory[], max: number) =>
    list.filter(s => !!s.id && !!s.audioUrl && !!s.title).slice(0, max);

  const categories: BrowseCategory[] = [];
  const cont = usable(continueListening, MAX_CONTINUE);
  if (cont.length) categories.push({ mediaId: 'continue', title: 'Continue listening', items: cont.map(toItem('continue')) });
  const play = usable(playlist, MAX_PLAYLIST);
  if (play.length) categories.push({ mediaId: 'playlist', title: 'My playlist', items: play.map(toItem('playlist')) });
  const trend = usable(trending, MAX_TRENDING);
  if (trend.length) categories.push({ mediaId: 'trending', title: 'Trending', items: trend.map(toItem('trending')) });

  if (!categories.length) {
    return [note('empty-note', 'Pin stories in the Runts app and they will show up here')];
  }
  // Defensive: a duplicate id would make the car play the wrong story.
  categories.forEach(c => c.items = c.items.filter(i => (seenIds.has(i.mediaId) ? false : (seenIds.add(i.mediaId), true))));
  return categories;
}
