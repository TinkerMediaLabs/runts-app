import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import PinButton from '../../components/common/PinButton';
import { useTipTarget } from '../../tips/useTipTarget';
import { speedLabel } from './PlayerSheets';
import { colors } from '@/theme/colors';
import { fontSizes, radius, iconSize } from '@/theme/tokens';

type Props = {
  storyId: string;
  onInfo: () => void;
  playbackRate: number;
  onSpeed: () => void;
  sleepMinutesLeft: number | null;
  sleepEndOfStory: boolean;
  onSleep: () => void;
  onShare: () => void;
  onBookmark: () => void;
};

// One quiet pill across the player: story info, pin, speed, sleep timer, share, bookmark, spread evenly. Every
// item is the same size and weight, and every item is also in the player menu as plain text.
export default function PlayerActionsBar({
  storyId, onInfo, playbackRate, onSpeed, sleepMinutesLeft, sleepEndOfStory, onSleep, onShare, onBookmark,
}: Props) {
  const tipRef = useTipTarget('player-actions');
  const sleepOn = sleepMinutesLeft !== null || sleepEndOfStory;
  const sleepLabel = sleepEndOfStory
    ? 'Sleep timer on, ends after this story'
    : sleepMinutesLeft !== null ? `Sleep timer on, ${sleepMinutesLeft} minutes left` : 'Sleep timer, off';

  return (
    <View ref={tipRef} collapsable={false} style={styles.bar} accessibilityRole="toolbar">
      <TouchableOpacity style={styles.item} onPress={onInfo} activeOpacity={0.7}
        accessibilityRole="button" accessibilityLabel="Story details" accessibilityHint="Opens the story page">
        <FontAwesome5 name="info-circle" size={iconSize.md} color={colors.textPrimary} iconStyle="solid" />
      </TouchableOpacity>

      <View style={styles.item}>
        <PinButton storyId={storyId} size={iconSize.md} inactiveColor={colors.textPrimary} />
      </View>

      <TouchableOpacity style={styles.item} onPress={onSpeed} activeOpacity={0.7}
        accessibilityRole="button" accessibilityLabel={`Playback speed, ${playbackRate} times`} accessibilityHint="Opens speed choices">
        <Text style={[styles.text, playbackRate !== 1 && styles.textActive]}>{speedLabel(playbackRate)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={onSleep} activeOpacity={0.7}
        accessibilityRole="button" accessibilityLabel={sleepLabel} accessibilityHint="Opens sleep timer choices">
        {sleepMinutesLeft !== null ? (
          <View style={styles.sleepActive}>
            <Text style={[styles.text, styles.textActive]}>
              {sleepMinutesLeft}<Text style={styles.unit}>m</Text>
            </Text>
            <FontAwesome5 name="moon" size={iconSize.xs} color={colors.accent} iconStyle="solid" style={styles.badge} />
          </View>
        ) : (
          <FontAwesome5 name="moon" size={iconSize.md} color={sleepOn ? colors.accent : colors.textPrimary} iconStyle="solid" />
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={onShare} activeOpacity={0.7}
        accessibilityRole="button" accessibilityLabel="Share story">
        <FontAwesome5 name="share" size={iconSize.md} color={colors.textPrimary} iconStyle="solid" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={onBookmark} activeOpacity={0.7}
        accessibilityRole="button" accessibilityLabel="Add bookmark" accessibilityHint="Saves your current position">
        <FontAwesome5 name="bookmark" size={iconSize.md} color={colors.textPrimary} iconStyle="solid" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.fillFaint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  item: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sleepActive: { paddingHorizontal: 6 },
  badge: { position: 'absolute', top: -6, right: -4 },
  unit: { fontSize: fontSizes.caption, fontWeight: '700' },
  text: { color: colors.textPrimary, fontSize: iconSize.md, fontWeight: '700' },
  textActive: { color: colors.accent },
});
