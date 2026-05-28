import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlaybackState, PlaybackState } from '@rntp/player';
import { audioEngine } from '@/features/audio/audioEngine';
import { usePlayerUI } from '@/context/PlayerUIContext';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import { useQueryClient } from '@tanstack/react-query';

const client = generateClient<Schema>();

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
};

const PlayerContext = createContext<any>(null);

export const PlayerProvider = ({ children }: any) => {

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    playbackRate: 1,
  });

  const { expand } = usePlayerUI();
  const queryClient = useQueryClient();

  // Ref so the event listener always has the latest track without stale closure
  const currentTrackRef = useRef<Track | null>(null);

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

        queryClient.invalidateQueries({ queryKey: ['finishedStories'] });
        queryClient.invalidateQueries({ queryKey: ['pinnedStories'] });
        queryClient.invalidateQueries({ queryKey: ['pinnedStoryIds'] });
        setState(prev => ({ ...prev, isPlaying: false }));

    } catch (err) {
        console.error('Track completion error:', err);
    }
};

  // ── Play ──────────────────────────────────────────────────────────────────
  const playTrack = async (track: Track) => {
    try {
      currentTrackRef.current = track;

      setState(prev => ({
        ...prev,
        currentTrack: track,
        isPlaying: true,
      }));

      expand();

      audioEngine.play(track).catch(err => {
        console.error('Play error:', err);
      });

    } catch (err) {
      console.error('PLAY ERROR', err);
    }
  };

  // ── Controls ──────────────────────────────────────────────────────────────
  const pause = async () => {
    await audioEngine.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  };

  const resume = async () => {
    await audioEngine.resume();
    setState(prev => ({ ...prev, isPlaying: true }));
  };

  const setPlaybackRate = async (rate: number) => {
    await audioEngine.setRate(rate);
    setState(prev => ({ ...prev, playbackRate: rate }));
  };

  return (
    <PlayerContext.Provider
      value={{
        state,
        playTrack,
        pause,
        resume,
        setPlaybackRate,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);