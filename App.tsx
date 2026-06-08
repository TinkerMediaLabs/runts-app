import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import AppShell from './src/navigation/AppShell';
import { PlayerUIProvider } from '@/context/PlayerUIContext';
import { AppProvider } from './src/context/AppContext';
import { PlayerProvider } from './src/context/PlayerContext';
import Navigation from './src/navigation';
import useCachedResources from './src/hooks/useCachedResources';
import TrackPlayer from '@rntp/player';
import { configureAmplify } from './src/lib/amplifyConfig';
import * as WebBrowser from 'expo-web-browser';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { Analytics } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Sentry — initialise before anything else renders
// ---------------------------------------------------------------------------

Sentry.init({
    dsn: Constants.expoConfig?.extra?.sentryDsn,
    environment: Constants.expoConfig?.extra?.APP_ENV ?? 'development',

    // Only send events in non-development environments.
    // Set to true (or remove this line) once you want dev errors reported too.
    enabled: Constants.expoConfig?.extra?.APP_ENV !== 'development',

    // Capture 100% of transactions for performance monitoring.
    // Lower this (e.g. 0.2) in production once you have volume.
    tracesSampleRate: 1.0,
});


// ---------------------------------------------------------------------------
// Amplify + OAuth
// ---------------------------------------------------------------------------

WebBrowser.maybeCompleteAuthSession();
configureAmplify();
SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
    const resourcesLoaded = useCachedResources();
    const [appReady, setAppReady] = useState(false);

    useEffect(() => {

        let mounted = true;

        async function bootstrap() {
            try {
                await TrackPlayer.setupPlayer({
                    contentType:              'music',
                    handleAudioBecomingNoisy: true,
                    android:                  { wakeMode: 'network' },
                });
                await Analytics.init();
            } catch (error) {
                Sentry.captureException(error);
                console.error('APP BOOTSTRAP ERROR', error);
            } finally {
                if (!mounted) return;
                setAppReady(true);
                await SplashScreen.hideAsync();
            }
        }

        bootstrap();

        return () => { mounted = false; };
    }, []);

    if (!resourcesLoaded || !appReady) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <AppProvider>
                        <PlayerUIProvider>
                            <PlayerProvider>
                                <AppShell>
                                    <Navigation colorScheme="dark" />
                                </AppShell>
                                <StatusBar
                                    style="light"
                                    backgroundColor="#000000"
                                />
                            </PlayerProvider>
                        </PlayerUIProvider>
                    </AppProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </QueryClientProvider>
    );
}

// Wrap with Sentry to capture unhandled errors and attach to the component tree
export default Sentry.wrap(App);