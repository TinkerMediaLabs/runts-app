import { createContext, useContext, useState } from 'react';
import { audioEngine } from '@/features/audio/audioEngine';
import { usePlayerUI } from '@/context/PlayerUIContext';

type Track = {
  id: string;
  title: string;
  artwork?: string;
  artist?: string;
  url: string;
};

type State = {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackRate: number;
};

const PlayerContext = createContext<any>(null);


export const PlayerProvider = ({ children }: any) => {

  const [state, setState] = useState<State>({
    currentTrack: null,
    isPlaying: false,
    playbackRate: 1,
  });

  const { expand } = usePlayerUI(); // 🔥 connect UI

  // -------------------------
  // PLAY (MAIN ENTRY POINT)
  // -------------------------
  const playTrack = async (track: Track) => {
    try {

      setState(prev => ({
        ...prev,
        currentTrack: track,
        isPlaying: true,
      }));

      expand(); // 🔥 open player UI

      audioEngine.play(track).catch(err => {
        console.error('Play error:', err);
      });

    } catch (err) {
      console.error('PLAY ERROR', err);
    }
  };

  // -------------------------
  // CONTROLS
  // -------------------------
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