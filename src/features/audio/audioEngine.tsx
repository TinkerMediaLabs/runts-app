import TrackPlayer from '@rntp/player';

export type Track = {
  id: string;
  title: string;
  url: string;
  artwork?: string;
  artist?: string;
};

class AudioEngine {

  private currentTrack: Track | null = null;

  async play(track: Track) {
    try {
      if (this.currentTrack?.id === track.id) {
        await TrackPlayer.play();
        return;
      }
      this.currentTrack = track;
      await TrackPlayer.setMediaItems([{
        url: track.url,
        title: track.title,
        artwork: track.artwork,
        artist: track.artist,
      } as any]);
      await TrackPlayer.play();
    } catch (error) {
      console.error('Play error:', error);
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

  // Returns current playback position in seconds
  getCurrentPosition(): number {
    try {
        return (TrackPlayer as any).getProgress?.()?.position ?? 0;
    } catch {
        return 0;
    }
}
}

export const audioEngine = new AudioEngine();