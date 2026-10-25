import TrackPlayer, { Event } from '@rntp/player';
import { getUrl } from 'aws-amplify/storage';
import { onlineManager } from '@tanstack/react-query';
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
type LocalMode = 'uri' | 'path' | 'remote';

async function resolveAudioUrl(url: string, localMode: LocalMode = 'uri'): Promise<string> {
  // Already a full URL — pass through
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }

  // Downloaded file first: it needs no network, and signing an S3 URL succeeds offline (no request is
  // made) so the player would be handed a link it cannot reach.
  try {
    const localPath = localMode === 'remote' ? null : await getLocalFilePath(url);
    if (localPath) {
      const info: any = await FileSystem.getInfoAsync(localPath);
      console.log('audioEngine: local file', localPath, 'exists:', info.exists, 'bytes:', info.size);
      // A real story is megabytes; a tiny file is a failed download, so ignore it and use the network.
      if (info.exists && (info.size ?? 0) > 100 * 1024) {
        // The player may want the plain path instead of a file:// address; the error ladder below tries both.
        return localMode === 'path' ? localPath.replace(/^file:\/\//, '') : localPath;
      }
    }
  } catch {
    // fall through to the network path
  }

  // No connection and no saved copy: say so plainly instead of handing the player a link that cannot load.
  if (!onlineManager.isOnline()) {
    throw new Error("This story isn't saved on your phone, so it can't play offline. Pin it while online to save it.");
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
  private localMode: LocalMode = 'uri';
  private playingLocal = false;
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
        console.warn('audioEngine: PlaybackError', JSON.stringify(e));
        const track = this.currentTrack;
        if (!track || e?.code === 'renderer') return;

        // A saved file the player cannot open: step through other ways to hand it over (plain path, then
        // the network when online) instead of staying silent. These steps are not rate limited.
        if (this.playingLocal) {
          const next: LocalMode = this.localMode === 'uri' ? 'path' : 'remote';
          if (next === 'remote' && !onlineManager.isOnline()) {
            console.error('audioEngine: saved file could not be opened and there is no connection');
            return;
          }
          this.localMode = next;
          try {
            const position = this.getCurrentPosition();
            const url = await resolveAudioUrl(track.url, next);
            this.playingLocal = url.startsWith('file://') || url.startsWith('/');
            console.log('audioEngine: retrying with', next, url.slice(0, 60));
            await TrackPlayer.setMediaItems([{ url, title: track.title, artwork: track.artwork, artist: track.artist } as any]);
            if (position > 0) await TrackPlayer.seekTo(position);
            await TrackPlayer.play();
          } catch (err) {
            console.error('audioEngine: local retry failed', err);
          }
          return;
        }

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
    // 'remote' is only a per-story rescue; the next story starts from the saved file again.
    if (this.localMode === 'remote') this.localMode = 'uri';
    const resolvedUrl = await resolveAudioUrl(track.url, this.localMode);
    this.playingLocal = resolvedUrl.startsWith('file://') || resolvedUrl.startsWith('/');
    console.log('audioEngine.play: resolvedUrl =', resolvedUrl);

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

  private pausedAt = 0;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  async pause() {
    try {
      this.pausedAt = Date.now();
      await TrackPlayer.pause();
    }
    catch (error) { console.error('Pause error:', error); }
  }

  /**
   * Press play after a pause: back up a little first so the listener picks the thread back up, the way
   * audiobook apps do. The longer the pause, the further back (0s under 5s, 2s, 5s, then 8s).
   */
  async resume() {
    try {
      if (this.pausedAt > 0) {
        const away = (Date.now() - this.pausedAt) / 1000;
        const back = away < 5 ? 0 : away < 60 ? 2 : away < 600 ? 5 : 8;
        const position = this.getCurrentPosition();
        if (back > 0 && position > back) await TrackPlayer.seekTo(position - back);
        this.pausedAt = 0;
      }
      await TrackPlayer.play();
    }
    catch (error) { console.error('Resume error:', error); }
  }

  /** Ease the volume down to silence over durationMs, then pause and restore the volume for next time. */
  fadeOutAndPause(durationMs: number) {
    this.cancelFade();
    const steps = Math.max(1, Math.floor(durationMs / 500));
    let step = 0;
    this.fadeTimer = setInterval(async () => {
      step++;
      try { (TrackPlayer as any).setVolume(Math.max(0, 1 - step / steps)); } catch {}
      if (step >= steps) {
        this.cancelFade(false);
        await this.pause();
        try { (TrackPlayer as any).setVolume(1); } catch {}
      }
    }, 500);
  }

  /** Stop a fade in progress (sleep timer cancelled or changed) and bring the volume back. */
  cancelFade(restore: boolean = true) {
    if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null; }
    if (restore) { try { (TrackPlayer as any).setVolume(1); } catch {} }
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