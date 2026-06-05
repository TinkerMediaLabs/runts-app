import TrackPlayer from '@rntp/player';
import { getUrl } from 'aws-amplify/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getLocalFilePath } from '../../lib/offlineStorage';

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
 * Resolves an audio URL/path in priority order:
 *   1. Local downloaded file (offline playback, no network needed)
 *   2. Existing HTTPS URL (pass-through)
 *   3. Signed S3 URL (in-memory cache, then fresh getUrl)
 */
async function resolveAudioUrl(url: string): Promise<string> {
  // Already a full URL — pass through
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }

  // Try signed S3 URL first (online path — works reliably with @rntp/player)
  const cached = signedUrlCache.get(url);
  const now    = Date.now();

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
      url:       resolved,
      expiresAt: now + (SIGNED_URL_EXPIRY_SECONDS - 60) * 1000,
    });
    return resolved;
  } catch (networkError) {
    // Network unavailable — fall back to local downloaded file
    try {
      const localPath = await getLocalFilePath(url);
      if (localPath) {
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) {
          return localPath;
        }
      }
    } catch {
      // No local file available either
    }
    throw new Error(`Failed to resolve audio URL — no network and no local file for "${url}"`);
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
    console.log('audioEngine.play: resolvedUrl =', resolvedUrl);  // ← add

    await TrackPlayer.stop();
    await new Promise(resolve => setTimeout(resolve, 100));

    await TrackPlayer.setMediaItems([{
      url:     resolvedUrl,
      title:   track.title,
      artwork: track.artwork,
      artist:  track.artist,
    } as any]);
    await TrackPlayer.play();
    console.log('audioEngine.play: play() called successfully');  // ← add
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