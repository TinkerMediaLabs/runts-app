import { useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { navigate } from '@/navigation/RootNavigator';
import { useApp } from '@/context/AppContext';

const client = generateClient<Schema>();

const STORY_PATH_RE = /\/runts\/story\/([a-zA-Z0-9_-]+)/;

// ---------------------------------------------------------------------------
// Hook — mount once inside the navigation context (AppShell)
// ---------------------------------------------------------------------------

export function useDeepLink() {
    const { eroticEnabled } = useApp();

    // Fetches story to check erotic status before deciding which screen to
    // navigate to. Falls back to StoryDetails if the fetch fails.
    const handleUrl = useCallback(async (url: string | null | undefined) => {
        if (!url) return;

        const match = url.match(STORY_PATH_RE);
        if (!match?.[1]) return;

        const storyId = match[1];

        try {
            const { data: story } = await client.models.Story.get({ id: storyId });

            if (story?.isErotic === 'true' && !eroticEnabled) {
                // Erotic story + erotic disabled → show blocked screen
                navigate('ContentBlocked', { storyId });
            } else {
                navigate('StoryDetails', { id: storyId });
            }
        } catch {
            // Story fetch failed — navigate normally, let the screen handle errors
            navigate('StoryDetails', { id: storyId });
        }
    }, [eroticEnabled]);

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