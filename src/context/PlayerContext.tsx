import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlaybackState, PlaybackState } from '@rntp/player';
import { audioEngine } from '@/features/audio/audioEngine';
import { usePlayerUI } from '@/context/PlayerUIContext';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import { useQueryClient } from '@tanstack/react-query';
import { upsertInProgressStory, getInProgressSeconds } from '@/hooks/queries/useInProgressStories';

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
};

const PlayerContext = createContext<any>(null);

export const PlayerProvider = ({ children }: any) => {

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    playbackRate: 1,
    playError: null,  // new
  });

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
      setTimeout(() => {
        audioEngine.seek(savedSeconds);
      }, 500);
    } else {
      // Fresh play (not a resume) — increment listen count
      queryClient.invalidateQueries({ queryKey: ['story', track.id] });
      try {
        await client.mutations.incrementListenCount({ storyId: track.id });
      } catch (err) {
        // Non-critical — don't fail playback if this errors
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

  const setPlaybackRate = async (rate: number) => {
    await audioEngine.setRate(rate);
    setState(prev => ({ ...prev, playbackRate: rate }));
  };

  const clearPlayError = () => {
    setState(prev => ({ ...prev, playError: null }));
  };

  useEffect(() => {
    return () => stopProgressTracking();
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        state,
        playTrack,
        pause,
        resume,
        setPlaybackRate,
        clearPlayError,  // new
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);