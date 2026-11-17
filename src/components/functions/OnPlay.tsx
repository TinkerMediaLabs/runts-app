import { useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationRouteContext } from '@react-navigation/native';
import { usePlayer } from '@/context/PlayerContext';
import { Analytics } from '@/lib/analytics';
import { useStorySource } from '@/hooks/useStorySource';
import { useIsGuest } from '@/lib/dataAccess';
import { askForAccount } from '@/lib/requireAccount';
import { PREMIUM_REQUIRED_MESSAGE, requestPremiumSheet } from '@/lib/premiumGate';
import { useApp } from '@/context/AppContext';
import { useQueryClient } from '@tanstack/react-query';

// `sourceOverride` labels plays that start somewhere with its own name (e.g. "continue").
const useOnPlay = (sourceOverride?: string) => {

  const { playTrack, state, clearPlayError } = usePlayer();
  const source = useStorySource();
  const guest = useIsGuest();
  const routeName = useContext(NavigationRouteContext)?.name;
  const { isPremium: userIsPremium } = useApp();
  const queryClient = useQueryClient();

  // Show an alert whenever playError is set, then clear it
  useEffect(() => {
    // A premium refusal is answered by the Premium sheet (PremiumGate), not by this alert.
    if (state.playError && state.playError !== PREMIUM_REQUIRED_MESSAGE) {
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
    isPremium,
  }: any) => {
    // Guests can hear the 30-second preview; the full story needs an account.
    if (guest) { askForAccount('listen to the full story', { kind: 'story', id }); return; }
    // A premium story for someone without Premium: show the sheet at once, before any network call. The caller's
    // flag wins; otherwise the phone's saved copy of the story. (The server still refuses the audio either way.)
    if (!userIsPremium) {
      const flag = isPremium ?? (queryClient.getQueryData(['story', id]) as any)?.isPremium;
      if (flag === true) { requestPremiumSheet(title); return; }
    }
    // On the story's own page the source was set when it was opened; anywhere else, this is where the play started.
    if (sourceOverride || routeName !== 'StoryScreen') Analytics.noteSource(id, sourceOverride ?? source);
    await playTrack({ id, title, url, artwork, artist });
  };

  return onPlay;
};

export default useOnPlay;
