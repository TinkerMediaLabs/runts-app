import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { audioLinks, isCdnPath } from '@/lib/audioLinks';

// A 30-second preview of a story, played from the story details screen with its OWN player so the main player
// (and its mini player, queue and saved place) is never touched. One preview at a time; starting one stops the
// last. It stops by itself after PREVIEW_SECONDS, when the app goes to the background, and when the main player
// starts or resumes (PlayerContext calls stopPreview).
//
// expo-audio is loaded lazily and guarded: an older installed build that does not contain it simply has no
// Preview button instead of crashing.

export const PREVIEW_SECONDS = 30;
export const DEFAULT_PREVIEW_START = 60;   // seconds in; used when the CMS has no start set for the story

type Status = 'idle' | 'loading' | 'playing';
type PreviewStory = { id: string; audioUri?: string | null; duration?: number | null; previewStartSeconds?: number | null };

let audioModule: any;   // undefined = not tried yet, null = not available in this build
function loadAudio() {
  if (audioModule !== undefined) return audioModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    audioModule = require('expo-audio');
  } catch {
    audioModule = null;
  }
  return audioModule;
}
export const previewAvailable = () => !!loadAudio()?.createAudioPlayer;

/** Where the preview starts: the CMS value, else the default, kept inside the story with room for the full preview. */
export function previewStartFor(story: Pick<PreviewStory, 'duration' | 'previewStartSeconds'>): number {
  const wanted = typeof story.previewStartSeconds === 'number' && story.previewStartSeconds >= 0
    ? story.previewStartSeconds
    : DEFAULT_PREVIEW_START;
  const duration = story.duration ?? 0;
  if (duration > 0) return Math.max(0, Math.min(wanted, duration - PREVIEW_SECONDS));
  return wanted;
}

let current: { storyId: string | null; status: Status } = { storyId: null, status: 'idle' };
const listeners = new Set<() => void>();
const set = (next: typeof current) => { current = next; listeners.forEach(l => l()); };

let player: any = null;
let statusSub: { remove?: () => void } | null = null;
let endTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove: () => void } | null = null;
let token = 0;   // bumped on every start/stop so a slow load that was cancelled cannot start playing late

function teardown() {
  token++;
  if (endTimer) { clearTimeout(endTimer); endTimer = null; }
  try { statusSub?.remove?.(); } catch {}
  statusSub = null;
  const p = player;
  player = null;
  if (p) {
    try { p.pause(); } catch {}
    try { (p.release ?? p.remove)?.call(p); } catch {}
  }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
}

export function stopPreview() {
  if (current.status === 'idle' && !player) return;
  teardown();
  set({ storyId: null, status: 'idle' });
}

/** Start the preview for this story, or stop it if it is the one already playing. Throws if it cannot start. */
export async function togglePreview(story: PreviewStory) {
  if (current.storyId === story.id && current.status !== 'idle') { stopPreview(); return; }
  const audio = loadAudio();
  if (!audio?.createAudioPlayer || !story.audioUri) throw new Error('Preview unavailable');

  teardown();
  const mine = token;
  set({ storyId: story.id, status: 'loading' });

  try {
    const url = isCdnPath(story.audioUri) ? await audioLinks.getOne(story.audioUri) : story.audioUri;
    if (!url) throw new Error('No audio link');
    if (mine !== token) return;   // stopped while the link was loading

    try { await audio.setAudioModeAsync?.({ playsInSilentMode: true, interruptionMode: 'doNotMix' }); } catch {}
    const p = audio.createAudioPlayer({ uri: url });
    player = p;

    const start = previewStartFor(story);
    const end = start + PREVIEW_SECONDS;

    // Wait until the file is ready, then jump to the start and play.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Preview took too long to load')), 12000);
      const ready = () => { clearTimeout(timeout); resolve(); };
      if (p.isLoaded) { ready(); return; }
      statusSub = p.addListener('playbackStatusUpdate', (st: any) => { if (st?.isLoaded) { try { statusSub?.remove?.(); } catch {} ready(); } });
    });
    if (mine !== token) return;

    if (start > 0) await p.seekTo(start);
    if (mine !== token) return;
    p.play();
    set({ storyId: story.id, status: 'playing' });

    statusSub = p.addListener('playbackStatusUpdate', (st: any) => {
      if (mine !== token) return;
      if (st?.didJustFinish || (typeof st?.currentTime === 'number' && st.currentTime >= end)) stopPreview();
    });
    endTimer = setTimeout(() => { if (mine === token) stopPreview(); }, (PREVIEW_SECONDS + 4) * 1000);   // safety net
    appStateSub = AppState.addEventListener('change', s => { if (s !== 'active') stopPreview(); });
  } catch (e) {
    if (mine === token) { teardown(); set({ storyId: null, status: 'idle' }); }
    throw e;
  }
}

/** 'idle' | 'loading' | 'playing' for this story's preview. */
export function usePreviewStatus(storyId: string | undefined): Status {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => (storyId && current.storyId === storyId ? current.status : 'idle'),
    () => 'idle' as Status,
  );
}
