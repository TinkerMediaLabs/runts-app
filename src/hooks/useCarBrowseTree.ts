import { useEffect } from 'react';
import { Platform } from 'react-native';
import TrackPlayer from '@rntp/player';
import { useApp } from '@/context/AppContext';
import { buildCarBrowseTree } from '@/features/audio/carBrowseTree';

// Keeps the car list in step with who is signed in. Mounted once in AppShell.
export function useCarBrowseTree() {
  const { isAuthenticated } = useApp();

  useEffect(() => {
    if (Platform.OS !== 'android') return; // CarPlay comes later, with the iPhone work
    try {
      TrackPlayer.setBrowseTree(buildCarBrowseTree({ signedIn: !!isAuthenticated }));
    } catch (e) {
      console.warn('[Car] could not update the browse tree', e);
    }
  }, [isAuthenticated]);
}
