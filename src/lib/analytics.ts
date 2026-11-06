/**
 * analytics.ts
 * Typed wrapper around the RudderStack React Native SDK.
 *
 * Usage:
 *   import { Analytics } from '@/lib/analytics';
 *   Analytics.init();                        // call once on app start
 *   Analytics.identify(userId); // call after sign-in
 *   Analytics.storyPlayStarted({ ... });     // call on events
 *   Analytics.reset();                       // call on sign-out
 */

import rudderClient from '@rudderstack/rudder-sdk-react-native';
import Constants from 'expo-constants';
import { createOnce, createSourceMemory } from './analyticsRules';

const WRITE_KEY: string  = Constants.expoConfig?.extra?.rudderWriteKey  ?? '';
const DATA_PLANE: string = Constants.expoConfig?.extra?.rudderDataPlane ?? '';

let initialised = false;
const sources = createSourceMemory();   // story id -> where the listener came from
const firstShownThisSession = createOnce();

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

// Only the user id is sent: no name or email, so analytics holds nothing that identifies a person by itself.
function identify(userId: string): void {
    if (!initialised) return;
    rudderClient.identify(userId);
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
    source?:    string;   // where the story was opened or started from (see analyticsRules)
    resumed?:   boolean;  // play_started: continued from saved progress rather than a first listen
}

// The funnel: story_opened -> story_play_started -> story_completed. All three carry the same `source`.
function noteSource(storyId: string | undefined | null, source: string): void {
    sources.note(storyId, source);
}

function storyOpened(props: { storyId: string; source: string }): void {
    sources.note(props.storyId, props.source);
    track('story_opened', props);
}

function storyPlayStarted(props: StoryEventProps): void {
    track('story_play_started', { ...props, source: props.source ?? sources.get(props.storyId) });
}

function storyCompleted(props: StoryEventProps): void {
    track('story_completed', { ...props, source: props.source ?? sources.get(props.storyId) });
}

function onboardingCompleted(): void {
    track('onboarding_completed', {});
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

// The text typed is not sent, only how long it was.
function searchPerformed(props: { tab: 'stories' | 'authors' | 'genres'; queryLength: number }): void {
    track('search_performed', props);
}

// A Home section was included in the layout the listener was shown (RudderStack does the reporting).
// Sent once per section per app session, not on every Home load.
function homeSectionShown(props: { sectionId: string; type: string; position: number }): void {
    if (!firstShownThisSession(props.sectionId)) return;
    track('home_section_shown', props);
}

// A genre's home screen was shown, and which size layout it got (RudderStack does the reporting).
function tagHomeShown(props: { tagId: string; tier: string }): void {
    track('tag_home_shown', props);
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

function track<T extends object>(event: string, properties: T): void {
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
    noteSource,
    storyOpened,
    storyPlayStarted,
    storyCompleted,
    onboardingCompleted,
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
    homeSectionShown,
    tagHomeShown,
    eroticEnabled,
    eroticDisabled,
};