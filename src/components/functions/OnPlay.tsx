import { usePlayer } from '@/context/PlayerContext';

const useOnPlay = () => {

  const { playTrack } = usePlayer();

  const onPlay = async ({
    id,
    title,
    url,
    artwork,
    artist,
  }: any) => {

    try {
      await playTrack({
        id,
        title,
        url,
        artwork,
        artist,
      });

    } catch (err) {
      console.error('Error playing story:', err);
    }
  };

  return onPlay;
};

export default useOnPlay;