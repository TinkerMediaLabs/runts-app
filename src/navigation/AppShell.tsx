import { useEffect, useState } from 'react';
import { View } from 'react-native';

import TrackPlayerWidget from '@/features/audio/TrackPlayer';
import ActionChip from '@/components/common/ActionChip';
import KeepGoingSheet from '@/components/story/KeepGoingSheet';
import OfflineBanner from '@/components/common/OfflineBanner';
import GuestSheet from '@/components/common/GuestSheet';
import DailyMoodSheet from '@/components/taste/DailyMoodSheet';

import { usePlayerUI } from '@/context/PlayerUIContext';
import { usePlayer } from '@/context/PlayerContext';
import TipOverlay from '@/tips/TipOverlay';
import { setTipsFlag } from '@/tips/tipsStore';

import { useDeepLink } from '@/hooks/useDeepLink';
import { useCarBrowseTree } from '@/hooks/useCarBrowseTree';
import { useCarPass } from '@/hooks/useCarPass';

export default function AppShell({ children }: any) {

  useDeepLink();
  useCarBrowseTree();
  useCarPass();

  const { expanded } = usePlayerUI();
  const { state, keepGoingStoryId } = usePlayer();

  // Context for first-use tips: the expanded player counts as its own "screen".
  useEffect(() => {
    setTipsFlag('playerExpanded', !!expanded && !!state.currentTrack);
  }, [expanded, state.currentTrack]);
  // Never show a tip over a rating popup or the Keep going sheet.
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
  const tipsBlocked = !!state.pendingRatingStoryId || !!keepGoingStoryId || moodSheetOpen;

  return (
    <View style={{ flex: 1 }}>
      {children}
      <TrackPlayerWidget expanded={expanded} />
      <KeepGoingSheet />
      <TipOverlay blocked={tipsBlocked} />
      <OfflineBanner />
      <ActionChip />
      <GuestSheet />
      <DailyMoodSheet onOpenChange={setMoodSheetOpen} />
    </View>
  );
}