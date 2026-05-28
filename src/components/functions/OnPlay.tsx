import { useEffect } from 'react';
import { Alert } from 'react-native';
import { usePlayer } from '@/context/PlayerContext';

const useOnPlay = () => {

  const { playTrack, state, clearPlayError } = usePlayer();

  // Show an alert whenever playError is set, then clear it
  useEffect(() => {
    if (state.playError) {
      Alert.alert(
        'Playback Error',
        'This story couldn not be loaded. Please check your connection and try again.',
        [{ text: 'OK', onPress: clearPlayError }]
      );
    }
  }, [state.playError]);

  const onPlay = async ({
    id,
    title,
    url,
    artwork,
    artist,
  }: any) => {
    await playTrack({ id, title, url, artwork, artist });
  };

  return onPlay;
};

export default useOnPlay;