import { View } from 'react-native';

import TrackPlayerWidget from '@/features/audio/TrackPlayer';
import ActionChip from '@/components/common/ActionChip';

import { usePlayerUI } from '@/context/PlayerUIContext';

import { useDeepLink } from '@/hooks/useDeepLink';

export default function AppShell({ children }: any) {

  useDeepLink();

  const { expanded } = usePlayerUI();

  return (
    <View style={{ flex: 1 }}>
      {children}
      <TrackPlayerWidget expanded={expanded} />
      <ActionChip />
    </View>
  );
}