import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { navigate } from '@/navigation/RootNavigator';

// ---------------------------------------------------------------------------
// URL patterns
// ---------------------------------------------------------------------------

// Matches: https://tinkermedia.net/runts/story/[id]
const STORY_RE = /\/runts\/story\/([a-zA-Z0-9_-]+)/;

function handleUrl(url: string | null | undefined) {
  if (!url) return;
  const storyMatch = url.match(STORY_RE);
  if (storyMatch?.[1]) {
    // Small delay on cold start to ensure navigator is mounted
    setTimeout(() => {
      navigate('StoryDetails', { id: storyMatch[1] });
    }, 300);
  }
}

// ---------------------------------------------------------------------------
// Hook — mount once inside the navigation context
// ---------------------------------------------------------------------------

export function useDeepLink() {
  // Cold start: app launched by tapping a link
  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
  }, []);

  // Hot start: link tapped while app is already running
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);
}