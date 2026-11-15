import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usePinStory } from './queries/usePinnedStories';
import { useFollowAuthor } from './queries/useAuthorFollowing';
import { hasPendingAction, takePendingAction } from '../lib/pendingAction';
import { navigate } from '@/navigation/RootNavigator';

// Mounted once in AppShell. When a guest has just signed in (or finished sign-up), does what they were trying to do
// when the "Create a free account" sheet opened: pins the story, follows the author, or opens the story or profile.
// Waits for onboarding to finish first, and a moment for the signed-in screens to take over from the guest ones.
const SETTLE_MS = 700;

export function useReplayAction() {
  const { isAuthenticated, isNewUser, isGuest, isLoading } = useApp();
  const pin = usePinStory();
  const follow = useFollowAuthor();

  useEffect(() => {
    if (isLoading || !isAuthenticated || isNewUser || isGuest || !hasPendingAction()) return;
    const action = takePendingAction();
    if (!action) return;
    setTimeout(() => {
      switch (action.kind) {
        case 'pin':
          pin.mutate(action.id);
          navigate('StoryScreen', { storyID: action.id, source: 'after_signup' });
          break;
        case 'follow':
          follow.mutate(action.id);
          navigate('AuthorDetails', { id: action.id });
          break;
        case 'story':
          navigate('StoryScreen', { storyID: action.id, source: 'after_signup' });
          break;
        case 'profile':
          navigate('UserScreen');
          break;
      }
    }, SETTLE_MS);
  }, [isLoading, isAuthenticated, isNewUser, isGuest]);
}
