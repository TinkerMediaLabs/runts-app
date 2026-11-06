import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import BottomSheet from '@/components/common/BottomSheet';
import { selectHaptic } from '../../lib/haptics';
import { colors } from '@/theme/colors';
import { fontSizes, iconSize } from '@/theme/tokens';

// The two bottom sheets opened from the player's action bar: playback speed and sleep timer.

export const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
export const speedLabel = (rate: number) => `${rate}x`;

export type SleepChoice = number | 'end' | null;
export const SLEEP_CHOICES: { label: string; value: SleepChoice }[] = [
  { label: 'Off', value: null },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: 'End of this story', value: 'end' },
];

const Row = ({ label, selected, onPress, a11yLabel }: { label: string; selected: boolean; onPress: () => void; a11yLabel: string }) => (
  <TouchableOpacity
    style={styles.row}
    activeOpacity={0.7}
    onPress={() => { selectHaptic(); onPress(); }}
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={a11yLabel}
  >
    <Text style={[styles.rowText, selected && styles.rowTextActive]}>{label}</Text>
    {selected ? <FontAwesome5 name="check" size={iconSize.sm} color={colors.accent} iconStyle="solid" /> : null}
  </TouchableOpacity>
);

export function PlaybackSpeedSheet({ visible, onClose, rate, onSelect }: {
  visible: boolean; onClose: () => void; rate: number; onSelect: (rate: number) => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Playback speed">
      {SPEEDS.map(s => (
        <Row
          key={s}
          label={speedLabel(s)}
          selected={rate === s}
          a11yLabel={`Playback speed ${s} times`}
          onPress={() => { onSelect(s); onClose(); }}
        />
      ))}
    </BottomSheet>
  );
}

export function SleepTimerSheet({ visible, onClose, minutesLeft, endOfStory, onSelect }: {
  visible: boolean; onClose: () => void; minutesLeft: number | null; endOfStory: boolean; onSelect: (value: SleepChoice) => void;
}) {
  const active = minutesLeft !== null || endOfStory;
  const isChosen = (v: SleepChoice) =>
    v === null ? !active : v === 'end' ? endOfStory : minutesLeft !== null && v >= minutesLeft && v - 15 < minutesLeft;
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Sleep timer">
      {SLEEP_CHOICES.map(({ label, value }) => (
        <Row
          key={label}
          label={label}
          selected={isChosen(value)}
          a11yLabel={value === null ? 'Sleep timer off' : `Sleep timer ${label}`}
          onPress={() => { onSelect(value); onClose(); }}
        />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { color: colors.textStrong, fontSize: fontSizes.body },
  rowTextActive: { color: colors.accent, fontWeight: '600' },
});
