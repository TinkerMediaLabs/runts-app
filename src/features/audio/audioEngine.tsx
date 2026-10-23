import TrackPlayer, { Event } from '@rntp/player';
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

  // Downloaded file first: it needs no network, and signing an S3 URL succeeds offline (no request is
  // made) so the player would be handed a link it cannot reach.
  try {
    const localPath = await getLocalFilePath(url);
    if (localPath) {
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) return localPath;
    }
  } catch {
    // fall through to the network path
  }

  const cached = signedUrlCache.get(url);
  const now    = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  try {
    const { url: signedUrl, expiresAt } = await getUrl({
      path: url,
      options: { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
    });
    const resolved = signedUrl.toString();
    // Amplify caps the URL lifetime at the signing credentials' expiry (usually ~1h), so trust the
    // returned expiresAt, not the requested 6h. Refresh 2 minutes early.
    const realExpiry = expiresAt ? expiresAt.getTime() : now + 15 * 60 * 1000;
    signedUrlCache.set(url, {
      url:       resolved,
      expiresAt: realExpiry - 2 * 60 * 1000,
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
  private lastRecoveryAt = 0;
  private errorSub: { remove: () => void } | null = null;

  constructor() {
    this.attachErrorRecovery();
  }

  /**
   * Signed S3 URLs are capped at the lifetime of the login credentials (~1h), so a long listen can
   * outlive the URL the player is holding. On a playback error, fetch a fresh URL and resume from
   * the same position. Limited to one attempt per 30s so a genuinely bad file cannot loop.
   * (Proper fix for launch: long-lived signed CloudFront URLs — see handoff "Future work".)
   */
  private attachErrorRecovery() {
    try {
      this.errorSub = (TrackPlayer as any).addEventListener(Event.PlaybackError, async (e: any) => {
        const track = this.currentTrack;
        if (!track || e?.code === 'renderer') return;
        const now = Date.now();
        if (now - this.lastRecoveryAt < 30_000) return;
        this.lastRecoveryAt = now;
        try {
          const position = this.getCurrentPosition();
          signedUrlCache.delete(track.url);
          const freshUrl = await resolveAudioUrl(track.url);
          await TrackPlayer.setMediaItems([{
            url:     freshUrl,
            title:   track.title,
            artwork: track.artwork,
            artist:  track.artist,
          } as any]);
          if (position > 0) await TrackPlayer.seekTo(position);
          await TrackPlayer.play();
          console.log('audioEngine: recovered from playback error at', position);
        } catch (err) {
          console.error('audioEngine: playback recovery failed', err);
        }
      });
    } catch (err) {
      console.error('audioEngine: could not attach error recovery', err);
    }
  }

async play(track: Track) {
  try {
    if (this.currentTrack?.id === track.id) {
      await TrackPlayer.play();
      return;
    }
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
    this.currentTrack = track;
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

  getDuration(): number {
    try {
      return (TrackPlayer as any).getProgress?.()?.duration ?? 0;
    } catch {
      return 0;
    }
  }

  // Jump forward (positive) or back (negative) from the current position, kept inside the track.
  async skipBy(deltaSeconds: number) {
    const duration = this.getDuration();
    let next = this.getCurrentPosition() + deltaSeconds;
    if (duration > 0) next = Math.min(next, Math.max(0, duration - 1));
    await this.seek(Math.max(0, next));
  }
}

export const audioEngine = new AudioEngine();