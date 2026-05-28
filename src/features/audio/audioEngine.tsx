import TrackPlayer from '@rntp/player';
import { getUrl } from 'aws-amplify/storage';

export type Track = {
  id: string;
  title: string;
  url: string;
  artwork?: string;
  artist?: string;
};

const SIGNED_URL_EXPIRY_SECONDS = 3600 * 6; // 6 hours

// In-memory cache: S3 path → { signedUrl, expiresAt }
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolves an S3 storage path to a signed HTTPS URL.
 * Caches the result for the duration of the signed URL's validity minus a
 * 60-second buffer, so we never serve a URL that's about to expire.
 * Passes through anything that's already an HTTPS URL untouched.
 */
async function resolveAudioUrl(url: string): Promise<string> {
  // Already a full URL (e.g. previously resolved, or an external URL)
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }

  const cached = signedUrlCache.get(url);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  try {
    const { url: signedUrl } = await getUrl({
      path: url,
      options: { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
    });
    const resolved = signedUrl.toString();

    signedUrlCache.set(url, {
      url: resolved,
      expiresAt: now + (SIGNED_URL_EXPIRY_SECONDS - 60) * 1000, // 60s buffer
    });

    return resolved;
  } catch (error) {
    // Re-throw with context so Sentry (when added) can distinguish
    // URL resolution failures from playback failures
    throw new Error(`Failed to resolve audio URL for path "${url}": ${error}`);
  }
}

class AudioEngine {

  private currentTrack: Track | null = null;

async play(track: Track) {
  try {
    if (this.currentTrack?.id === track.id) {
      await TrackPlayer.play();
      return;
    }
    this.currentTrack = track;
    const resolvedUrl = await resolveAudioUrl(track.url);

    // Reset queue before loading new track to avoid stale key collisions
    await TrackPlayer.stop();
    await new Promise(resolve => setTimeout(resolve, 100));

    await TrackPlayer.setMediaItems([{
      url: resolvedUrl,
      title: track.title,
      artwork: track.artwork,
      artist: track.artist,
    } as any]);
    await TrackPlayer.play();
  } catch (error) {
    console.error('Play error:', error);
    throw error;
  }
}

  async pause() {
    try { await TrackPlayer.pause(); }
    catch (error) { console.error('Pause error:', error); }
  }

  async resume() {
    try { await TrackPlayer.play(); }
    catch (error) { console.error('Resume error:', error); }
  }

  async stop() {
    try { await TrackPlayer.stop(); this.currentTrack = null; }
    catch (error) { console.error('Stop error:', error); }
  }

  async seek(seconds: number) {
    try { await TrackPlayer.seekTo(seconds); }
    catch (error) { console.error('Seek error:', error); }
  }

  async setRate(rate: number) {
    try { (TrackPlayer as any).setPlaybackSpeed(rate); }
    catch (error) { console.error('SetRate error:', error); }
  }

  getCurrentPosition(): number {
    try {
      return (TrackPlayer as any).getProgress?.()?.position ?? 0;
    } catch {
      return 0;
    }
  }
}

export const audioEngine = new AudioEngine();