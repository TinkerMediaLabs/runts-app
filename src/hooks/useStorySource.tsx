import { createContext, useCallback, useContext } from 'react';
import { NavigationRouteContext, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/types';
import { sourceForRoute } from '../lib/analyticsRules';

// A section can label the stories inside it (Home sections do: "home:<type>"). Without one, the screen decides.
export const StorySourceContext = createContext<string | undefined>(undefined);

// Where stories on this part of the screen are being opened from, for the funnel events. Safe outside a screen.
export function useStorySource(): string {
  const fromSection = useContext(StorySourceContext);
  const route = useContext(NavigationRouteContext);
  return fromSection ?? sourceForRoute(route?.name);
}

// Open a story's page, recording where it was opened from.
export function useOpenStory() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const source = useStorySource();
  return useCallback(
    (storyID: string, override?: string) => navigation.navigate('StoryScreen', { storyID, source: override ?? source }),
    [navigation, source],
  );
}
