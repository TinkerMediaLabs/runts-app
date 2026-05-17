import {
    useEffect,
    useState,
} from 'react';

import { StatusBar } from 'expo-status-bar';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import AppShell from './src/navigation/AppShell';
import { PlayerUIProvider } from '@/context/PlayerUIContext';
import {AppProvider} from './src/context/AppContext';
import {PlayerProvider} from './src/context/PlayerContext';

import Navigation from './src/navigation';
import useCachedResources from './src/hooks/useCachedResources';

import TrackPlayer from '@rntp/player';

SplashScreen.preventAutoHideAsync();



export default function App() {

    const resourcesLoaded =useCachedResources();

    const [appReady, setAppReady] = useState(false);

    const [initialRoute] = useState('SignIn');

    useEffect(() => {
        let mounted = true;

        async function bootstrap() {
            try {
                await TrackPlayer.setupPlayer({
                    contentType: 'music',
                    handleAudioBecomingNoisy: true,
                    android: { wakeMode: 'network' },
                });
            } catch (error) {
                console.error('APP BOOTSTRAP ERROR', error);
            } finally {
                if (!mounted) return;

                setAppReady(true);
                await SplashScreen.hideAsync();
            }
        }

        bootstrap();

        return () => {
            mounted = false;
        };
    }, []);

    if (
        !resourcesLoaded ||
        !appReady
    ) {
        return null;
    }

    return (

        <GestureHandlerRootView style={{ flex: 1 }}>

            <SafeAreaProvider>

                <AppProvider>

                    <PlayerUIProvider>

                        <PlayerProvider>

                            <AppShell>
                                <Navigation
                                    colorScheme="dark"
                                    initialRoute={initialRoute}
                                />
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

    );
}