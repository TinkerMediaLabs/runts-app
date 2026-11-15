import { useEffect, useCallback, useRef } from 'react';
import * as Linking from 'expo-linking';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { navigate } from '@/navigation/RootNavigator';
import { useApp } from '@/context/AppContext';
import { markOpenedFromOutside } from '@/lib/launchContext';
import { parseStoryLink } from '@/lib/shareLink';




// ---------------------------------------------------------------------------
// Hook — mount once inside the navigation context (AppShell)
// ---------------------------------------------------------------------------

export function useDeepLink() {
    const { eroticEnabled, isGuest, isAuthenticated, isNewUser, isLoading, continueAsGuest } = useApp();

    // A link that arrives before the app can show a story (still starting up, or signed out) waits here.
    const pendingUrl = useRef<string | null>(null);

    // Fetches story to check erotic status before deciding which screen to
    // navigate to. Falls back to StoryDetails if the fetch fails.
    const handleUrl = useCallback(async (url: string | null | undefined) => {
        if (!url) return;

        const storyId = parseStoryLink(url);
        if (!storyId) return;
        markOpenedFromOutside();

        // Not ready to show a story yet: keep the link. Someone who opens a shared link without an account is taken
        // straight in as a guest, so they see the story at once and can sign up from there.
        if (isLoading || (isAuthenticated && isNewUser)) { pendingUrl.current = url; return; }
        if (!isAuthenticated && !isGuest) { pendingUrl.current = url; continueAsGuest(); return; }

        try {
            const client = generateClient<Schema>();
            const { data: story } = await client.models.Story.get({ id: storyId });

            if (story?.isErotic === 'true' && !eroticEnabled) {
                // Erotic story + erotic disabled → show blocked screen
                navigate('ContentBlocked', { storyId });
            } else {
                navigate('StoryScreen', { storyID: storyId, source: 'link' });
            }
        } catch {
            // Story fetch failed — navigate normally, let the screen handle errors
            navigate('StoryScreen', { storyID: storyId, source: 'link' });
        }
    }, [eroticEnabled, isLoading, isAuthenticated, isNewUser, isGuest]);

    // Open a waiting link once the app can show it.
    useEffect(() => {
        if (!pendingUrl.current || isLoading || (isAuthenticated && isNewUser)) return;
        if (!isAuthenticated && !isGuest) { continueAsGuest(); return; }   // this effect runs again once guest mode is on
        const url = pendingUrl.current;
        pendingUrl.current = null;
        setTimeout(() => handleUrl(url), 300);
    }, [isLoading, isAuthenticated, isNewUser, isGuest, handleUrl, continueAsGuest]);

    // Cold start — app launched by tapping a link
    useEffect(() => {
        Linking.getInitialURL().then(url => {
            if (url) setTimeout(() => handleUrl(url), 300);
        });
    }, [handleUrl]);

    // Hot start — link tapped while app is already running
    useEffect(() => {
        const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
        return () => subscription.remove();
    }, [handleUrl]);
}