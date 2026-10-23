import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import Feather from '@expo/vector-icons/Feather';
import { selectHaptic } from '../../lib/haptics';

type Choice = number | 'end' | null;

const CHOICES: { label: string; value: Choice }[] = [
  { label: 'Off', value: null },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: 'End of this story', value: 'end' },
];

type Props = {
  minutesLeft: number | null;
  endOfStory: boolean;
  onSelect: (value: Choice) => void;
};

// A visible sleep timer on the player: a moon button that shows what is running, and a small menu to
// pick a time or "end of this story". The Options menu keeps the same choices.
export default function SleepTimerButton({ minutesLeft, endOfStory, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const active = minutesLeft !== null || endOfStory;
  const status = endOfStory ? 'Ends after this story' : minutesLeft !== null ? `${minutesLeft} min left` : 'Sleep timer';
  const isChosen = (v: Choice) =>
    v === null ? !active : v === 'end' ? endOfStory : minutesLeft !== null && v >= minutesLeft && v - 15 < minutesLeft;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.button, active && styles.buttonActive]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={active ? `Sleep timer on. ${status}` : 'Sleep timer, off'}
        accessibilityHint="Opens choices to stop playback after a time or at the end of the story"
      >
        <Feather name="moon" size={16} color={active ? 'cyan' : '#fff'} />
        <Text style={[styles.text, active && styles.textActive]}>{status}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityRole="none">
          <View style={styles.card} accessibilityViewIsModal>
            <Text style={styles.title} accessibilityRole="header">Sleep timer</Text>
            {CHOICES.map(({ label, value }) => {
              const chosen = isChosen(value);
              return (
                <TouchableOpacity
                  key={label}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => { selectHaptic(); onSelect(value); setOpen(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.rowText, chosen && styles.rowTextActive]}>{label}</Text>
                  {chosen ? <Feather name="check" size={18} color="cyan" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 10 },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 44, paddingHorizontal: 16, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)',
  },
  buttonActive: { borderColor: 'cyan', backgroundColor: 'rgba(0,255,255,0.1)' },
  text: { color: '#fff', fontSize: 14 },
  textActive: { color: 'cyan' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#161616', borderRadius: 16, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 20, paddingVertical: 12 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  rowText: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  rowTextActive: { color: 'cyan' },
});
