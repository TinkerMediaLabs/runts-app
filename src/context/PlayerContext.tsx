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
import { getDefaultPlaybackSpeed } from '@/lib/audioSettings';

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

  const sleepTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);

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

      const { data: existingFinished } = await client.models.UserFinishedStory.list({
        filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyId } }] },
      });
      if (!existingFinished?.length) {
        await client.models.UserFinishedStory.create({
          userId,
          storyId,
          finishedAt: new Date().toISOString(),
        });
        // First completion — trigger rating modal
        setState(prev => ({ ...prev, pendingRatingStoryId: storyId }));
      }

      const { data: pinned } = await client.models.UserPinnedStory.list({
        filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyId } }] },
      });
      if (pinned?.length) {
        await client.models.UserPinnedStory.delete({ id: pinned[0].id });
      }

      const { data: inProgress } = await client.models.UserInProgressStory.list({
        filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyId } }] },
      });
      if (inProgress?.length) {
        await client.models.UserInProgressStory.delete({ id: inProgress[0].id });
      }

      queryClient.invalidateQueries({ queryKey: ['finishedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
      queryClient.invalidateQueries({ queryKey: ['inProgressStories'] });

      setState(prev => ({ ...prev, isPlaying: false }));

    } catch (err) {
      console.error('Track completion error:', err);
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);