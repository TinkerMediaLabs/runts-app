import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlaybackState, PlaybackState } from '@rntp/player';
import { audioEngine } from '@/features/audio/audioEngine';
import { usePlayerUI } from '@/context/PlayerUIContext';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import { useQueryClient } from '@tanstack/react-query';
import { upsertInProgressStory, getInProgressSeconds } from '@/hooks/queries/useInProgressStories';
import { Hub } from 'aws-amplify/utils';
import { getDefaultPlaybackSpeed, getAutoplayEnabled } from '@/lib/audioSettings';
import { useApp } from '@/context/AppContext';

const client = generateClient<Schema>();

const PROGRESS_INTERVAL_MS = 10000;

type Track = {
  id: string;
  title: string;
  artwork?: string;
  artist?: string;
  url: string;
};

type PlayerState = {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackRate: number;
  playError: string | null;  // new
  pendingRatingStoryId: string | null;
};

const PlayerContext = createContext<any>(null);

export const PlayerProvider = ({ children }: any) => {

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    playbackRate: 1,
    playError: null,  // new
    pendingRatingStoryId: null,
  });

  const { refreshProfile } = useApp();

  const sleepTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);

  const playlistRef      = useRef<any[]>([]);
  const playlistIndexRef = useRef(-1);
  const [hasNextTrack, setHasNextTrack] = useState(false);

  const { expand } = usePlayerUI();
  const queryClient = useQueryClient();

  const currentTrackRef  = useRef<Track | null>(null);
  const isPlayingRef     = useRef(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Playback state listener for track completion ──────────────────────────
  const playbackState = usePlaybackState();
  const prevPlaybackStateRef = useRef<PlaybackState | null>(null);

  useEffect(() => {
    const justEnded =
      playbackState === PlaybackState.Ended &&
      prevPlaybackStateRef.current !== PlaybackState.Ended;

    if (justEnded) {
      handleTrackEnd();
    }

    prevPlaybackStateRef.current = playbackState;
  }, [playbackState]);

const handleTrackEnd = async () => {
  const storyId = currentTrackRef.current?.id;
  if (!storyId) return;

  stopProgressTracking();

  try {
    const { userId } = await getCurrentUser();

    // ── Mark as finished (first time only) ───────────────────────────────
    const { data: existingFinished } = await client.models.UserFinishedStory.list({
      filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyId } }] },
    });
    const isFirstCompletion = !existingFinished?.length;
    if (isFirstCompletion) {
      await client.models.UserFinishedStory.create({
        userId,
        storyId,
        finishedAt: new Date().toISOString(),
      });
      setState(prev => ({ ...prev, pendingRatingStoryId: storyId }));

      // Increment profile stats — parallel fetch story duration + user record
      try {
        const [{ data: story }, { data: user }] = await Promise.all([
          client.models.Story.get({ id: storyId }),
          client.models.User.get({ id: userId }),
        ]);
        await client.models.User.update({
          id: userId,
          totalStoriesFinished: (user?.totalStoriesFinished ?? 0) + 1,
          totalListenSeconds:   (user?.totalListenSeconds   ?? 0) + (story?.duration ?? 0),
        });
        await refreshProfile();
      } catch (err) {
        console.warn('Profile stats update error:', err);
      }
    }

    // ── Remove from pinned ────────────────────────────────────────────────
    const { data: pinned } = await client.models.UserPinnedStory.list({
      filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyId } }] },
    });
    if (pinned?.length) {
      await client.models.UserPinnedStory.delete({ id: pinned[0].id });
    }

    // ── Remove from in-progress ───────────────────────────────────────────
    const { data: inProgress } = await client.models.UserInProgressStory.list({
      filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyId } }] },
    });
    if (inProgress?.length) {
      await client.models.UserInProgressStory.delete({ id: inProgress[0].id });
    }

    // ── Invalidate caches ─────────────────────────────────────────────────
    queryClient.invalidateQueries({ queryKey: ['finishedStories'] });
    queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
    queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
    queryClient.invalidateQueries({ queryKey: ['inProgressStories'] });

    // ── Autoplay next in playlist or stop ─────────────────────────────────
    const updatedPlaylist = await loadPlaylist();
    const autoplay = await getAutoplayEnabled();

    if (
      autoplay &&
      playlistIndexRef.current >= 0 &&
      playlistIndexRef.current < updatedPlaylist.length - 1
    ) {
      const nextStory = updatedPlaylist[playlistIndexRef.current];
      if (nextStory) {
        await playNext();
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
    }

  } catch (err) {
    console.error('Track completion error:', err);
    setState(prev => ({ ...prev, isPlaying: false }));
  }
};

  // ── Progress tracking interval ────────────────────────────────────────────
  const startProgressTracking = (storyId: string) => {
    stopProgressTracking();
    progressInterval.current = setInterval(async () => {
      if (!isPlayingRef.current) return;
      try {
        const position = audioEngine.getCurrentPosition();
        if (position > 0) {
          await upsertInProgressStory(storyId, position);
          queryClient.invalidateQueries({ queryKey: ['inProgressStories'] });
        }
      } catch (err) {
        console.error('Progress save error:', err);
      }
    }, PROGRESS_INTERVAL_MS);
  };

  const playTrackAt = async (track: Track, seekSeconds: number) => {
    await playTrack(track);
    // Seek at 700ms — after the normal in-progress seek at 500ms, overriding it
    setTimeout(() => audioEngine.seek(seekSeconds), 700);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // ── Play ──────────────────────────────────────────────────────────────────
const playTrack = async (track: Track) => {
  setState(prev => ({ ...prev, playError: null }));

  try {
    currentTrackRef.current = track;
    isPlayingRef.current = true;

    setState(prev => ({
      ...prev,
      currentTrack: track,
      isPlaying: true,
      playError: null,
    }));

    expand();

    const savedSeconds = await getInProgressSeconds(track.id);

    await audioEngine.play(track);

    // Load playlist and find current position
// Load playlist and find current position
const playlist = await loadPlaylist();
console.log('playTrack: playlist.length =', playlist.length);
console.log('playTrack: track.id =', track.id);
console.log('playTrack: playlist IDs =', playlist.map((s: any) => s.id));
const index = playlist.findIndex((s: any) => s.id === track.id);
console.log('playTrack: index =', index);
playlistIndexRef.current = index;
setHasNextTrack(index >= 0 && index < playlist.length - 1);

    if (savedSeconds > 0) {
      // Resume — seek to saved position
      setTimeout(() => {
        audioEngine.seek(savedSeconds);
      }, 500);
    } else {
      // Fresh play — apply default speed and increment listen count
      const defaultSpeed = await getDefaultPlaybackSpeed();
      if (defaultSpeed !== 1) {
        await audioEngine.setRate(defaultSpeed);
        setState(prev => ({ ...prev, playbackRate: defaultSpeed }));
      }
      queryClient.invalidateQueries({ queryKey: ['story', track.id] });
      try {
        await client.mutations.incrementListenCount({ storyId: track.id });
      } catch (err) {
        console.warn('incrementListenCount error:', err);
      }
    }

    startProgressTracking(track.id);

  } catch (err) {
    isPlayingRef.current = false;
    currentTrackRef.current = null;
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTrack: null,
      playError: err instanceof Error ? err.message : 'Failed to load audio. Please try again.',
    }));
    stopProgressTracking();
    console.error('PLAY ERROR', err);
  }
};

  // ── Controls ──────────────────────────────────────────────────────────────
  const pause = async () => {
    isPlayingRef.current = false;
    await audioEngine.pause();
    setState(prev => ({ ...prev, isPlaying: false }));

    if (currentTrackRef.current) {
      try {
        const position = audioEngine.getCurrentPosition();
        if (position > 0) {
          await upsertInProgressStory(currentTrackRef.current.id, position);
          queryClient.invalidateQueries({ queryKey: ['inProgressStories'] });
        }
      } catch (err) {
        console.error('Pause progress save error:', err);
      }
    }
  };

  const resume = async () => {
    isPlayingRef.current = true;
    await audioEngine.resume();
    setState(prev => ({ ...prev, isPlaying: true }));
    if (currentTrackRef.current) {
      startProgressTracking(currentTrackRef.current.id);
    }
  };

  const clearPendingRating = () => {
    setState(prev => ({ ...prev, pendingRatingStoryId: null }));
  };

  const setPlaybackRate = async (rate: number) => {
    await audioEngine.setRate(rate);
    setState(prev => ({ ...prev, playbackRate: rate }));
  };

  const clearPlayError = () => {
    setState(prev => ({ ...prev, playError: null }));
  };

  const clearTrack = async () => {
    setSleepTimer(null);
    stopProgressTracking();
    isPlayingRef.current = false;
    currentTrackRef.current = null;
    playlistRef.current = [];
    playlistIndexRef.current = -1;
    setHasNextTrack(false);
    await audioEngine.stop();
    setState({
      currentTrack: null,
      isPlaying: false,
      playbackRate: 1,
      playError: null,
      pendingRatingStoryId: null,
    });
  };

  const setSleepTimer = async (minutes: number | null) => {
    // Clear any existing timer
    if (sleepTimerRef.current)    clearTimeout(sleepTimerRef.current);
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    sleepTimerRef.current    = null;
    sleepIntervalRef.current = null;
    setSleepMinutesLeft(null);

    if (!minutes) return;

    setSleepMinutesLeft(minutes);

    // Countdown — updates every minute
    sleepIntervalRef.current = setInterval(() => {
      setSleepMinutesLeft(prev => {
        if (prev === null || prev <= 1) {
          if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 60 * 1000);

    // Pause when timer expires
    sleepTimerRef.current = setTimeout(async () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
      setSleepMinutesLeft(null);
      isPlayingRef.current = false;
      await audioEngine.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }, minutes * 60 * 1000);
  };

  const loadPlaylist = async (): Promise<any[]> => {
    try {
      const { userId } = await getCurrentUser();
      const { data: pinnedRecords } = await client.models.UserPinnedStory.list({
        filter: { userId: { eq: userId } },
      });
      const sorted = (pinnedRecords ?? [])
        .filter(r => !!r.storyId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const storyResults = await Promise.all(
        sorted.map(r => client.models.Story.get({ id: r.storyId }))
      );
      const stories = storyResults.map(r => r.data).filter(Boolean);

      // Fetch author names
      const authorIds = [...new Set(stories.map((s: any) => s.authorId).filter(Boolean))];
      const authorResults = await Promise.all(
        authorIds.map((id: string) => client.models.Author.get({ id }))
      );
      const authorMap: Record<string, string> = {};
      authorResults.forEach(r => {
        if (r.data?.id && r.data?.name) authorMap[r.data.id] = r.data.name;
      });

      const enriched = stories.map((s: any) => ({
        ...s,
        authorName: authorMap[s.authorId ?? ''] ?? '',
      }));

      playlistRef.current = enriched;
      return enriched;
    } catch (err) {
      console.error('loadPlaylist error:', err);
      return [];
    }
  };

  const playNext = async () => {
    const nextIndex = playlistIndexRef.current + 1;
    if (nextIndex >= playlistRef.current.length) return;
    const next = playlistRef.current[nextIndex];
    if (!next) return;
    await playTrack({
      id: next.id,
      title: next.title ?? '',
      url: next.audioUri ?? '',
      artwork: next.imageUri ?? '',
      artist: next.authorName ?? '',
    });
  };

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedOut') clearTrack();
    });
    return () => {
      stopProgressTracking();
      if (sleepTimerRef.current)    clearTimeout(sleepTimerRef.current);
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
      unsubscribe();
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        state,
        playTrack,
        pause,
        resume,
        setPlaybackRate,
        clearPlayError,
        clearPendingRating,
        clearTrack,
        sleepMinutesLeft,
        setSleepTimer,
        hasNextTrack,
        playNext,
        playTrackAt,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);