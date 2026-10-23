import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// Offline: the app keeps a bounded on-device copy of the data the listener has already viewed (their
// own stories, pins, progress, authors, tags) so those screens open without a connection. Search results,
// comments, recommendations and signed image URLs are never saved. The copy is capped by what one user
// views, not by catalog size.
const DAY = 1000 * 60 * 60 * 24;
export const PERSIST_MAX_AGE = 7 * DAY;

onlineManager.setEventListener(setOnline =>
    NetInfo.addEventListener(state => setOnline(state.isConnected !== false && state.isInternetReachable !== false))
);

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: PERSIST_MAX_AGE,
            retry: 2,
            networkMode: 'offlineFirst',
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 0,
        },
    },
});

export const queryPersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: '@runts/query_cache',
    throttleTime: 2000,
});

const PERSISTED_ROOTS = new Set([
    'story', 'author', 'authorName', 'tag', 'tags', 'universe', 'narrator', 'storyNarratorNames',
    'storyScenes', 'pinnedStories', 'isPinned', 'storyProgress', 'inProgressStories',
    'finishedStories', 'favoritedStories', 'bookmarks', 'stories',
]);

export const shouldPersistQuery = (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
    query.state.status === 'success' && PERSISTED_ROOTS.has(String(query.queryKey[0]));
