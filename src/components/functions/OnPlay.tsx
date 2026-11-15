import { useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationRouteContext } from '@react-navigation/native';
import { usePlayer } from '@/context/PlayerContext';
import { Analytics } from '@/lib/analytics';
import { useStorySource } from '@/hooks/useStorySource';
import { useIsGuest } from '@/lib/dataAccess';
import { askForAccount } from '@/lib/requireAccount';

// `sourceOverride` labels plays that start somewhere with its own name (e.g. "continue").
const useOnPlay = (sourceOverride?: string) => {

  const { playTrack, state, clearPlayError } = usePlayer();
  const source = useStorySource();
  const guest = useIsGuest();
  const routeName = useContext(NavigationRouteContext)?.name;

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
    // Guests can hear the 30-second preview; the full story needs an account.
    if (guest) { askForAccount('listen to the full story', { kind: 'story', id }); return; }
    // On the story's own page the source was set when it was opened; anywhere else, this is where the play started.
    if (sourceOverride || routeName !== 'StoryScreen') Analytics.noteSource(id, sourceOverride ?? source);
    await playTrack({ id, title, url, artwork, artist });
  };

  return onPlay;
};

export default useOnPlay;
