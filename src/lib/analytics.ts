/**
 * analytics.ts
 * Typed wrapper around the RudderStack React Native SDK.
 *
 * Usage:
 *   import { Analytics } from '@/lib/analytics';
 *   Analytics.init();                        // call once on app start
 *   Analytics.identify(userId, name, email); // call after sign-in
 *   Analytics.storyPlayStarted({ ... });     // call on events
 *   Analytics.reset();                       // call on sign-out
 */

import rudderClient from '@rudderstack/rudder-sdk-react-native';
import Constants from 'expo-constants';

const WRITE_KEY: string  = Constants.expoConfig?.extra?.rudderWriteKey  ?? '';
const DATA_PLANE: string = Constants.expoConfig?.extra?.rudderDataPlane ?? '';

let initialised = false;

// ---------------------------------------------------------------------------
// Init + Identity
// ---------------------------------------------------------------------------

async function init(): Promise<void> {
    if (initialised || !WRITE_KEY || !DATA_PLANE) return;
    try {
        await rudderClient.setup(WRITE_KEY, {
            dataPlaneUrl:             DATA_PLANE,
            trackAppLifecycleEvents:  true,
            recordScreenViews:        false,
        });
        initialised = true;
    } catch (err) {
        console.warn('[Analytics] init failed:', err);
    }
}

function identify(userId: string, name?: string, email?: string): void {
    if (!initialised) return;
    rudderClient.identify(userId, { name, email });
}

function reset(): void {
    if (!initialised) return;
    rudderClient.reset();
}

// ---------------------------------------------------------------------------
// Story events
// ---------------------------------------------------------------------------

interface StoryEventProps {
    storyId:    string;
    title?:      string;
    author?:    string;
    genre?:     string;
    duration?:  number;
    isErotic?:  boolean;
}

function storyPlayStarted(props: StoryEventProps): void {
    track('story_play_started', props);
}

function storyCompleted(props: StoryEventProps): void {
    track('story_completed', props);
}

function storyPinned(props: Pick<StoryEventProps, 'storyId' | 'title'>): void {
    track('story_pinned', props);
}

function storyUnpinned(props: Pick<StoryEventProps, 'storyId' | 'title'>): void {
    track('story_unpinned', props);
}

function storyRated(props: StoryEventProps & { rating: number }): void {
    track('story_rated', props);
}

function storyReacted(props: StoryEventProps & { reaction: string }): void {
    track('story_reacted', props);
}

function storyCommented(props: Pick<StoryEventProps, 'storyId' | 'title'>): void {
    track('story_commented', props);
}

function storyBookmarked(props: Pick<StoryEventProps, 'storyId' | 'title'> & { positionSeconds: number }): void {
    track('story_bookmarked', props);
}

function storyShared(props: Pick<StoryEventProps, 'storyId' | 'title'>): void {
    track('story_shared', props);
}

// ---------------------------------------------------------------------------
// Author events
// ---------------------------------------------------------------------------

function authorFollowed(authorId: string, authorName?: string): void {
    track('author_followed', { authorId, authorName });
}

function authorUnfollowed(authorId: string, authorName?: string): void {
    track('author_unfollowed', { authorId, authorName });
}

// ---------------------------------------------------------------------------
// Discovery events
// ---------------------------------------------------------------------------

function searchPerformed(query: string, tab: 'stories' | 'authors' | 'genres'): void {
    track('search_performed', { query, tab });
}

function genreTapped(tagId: string, tagName: string): void {
    track('genre_tapped', { tagId, tagName });
}

// ---------------------------------------------------------------------------
// Settings events
// ---------------------------------------------------------------------------

function eroticEnabled(): void {
    track('erotic_enabled', {});
}

function eroticDisabled(): void {
    track('erotic_disabled', {});
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function track(event: string, properties: Record<string, unknown>): void {
    if (!initialised) return;
    rudderClient.track(event, properties);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const Analytics = {
    init,
    identify,
    reset,
    storyPlayStarted,
    storyCompleted,
    storyPinned,
    storyUnpinned,
    storyRated,
    storyReacted,
    storyCommented,
    storyBookmarked,
    storyShared,
    authorFollowed,
    authorUnfollowed,
    searchPerformed,
    genreTapped,
    eroticEnabled,
    eroticDisabled,
};