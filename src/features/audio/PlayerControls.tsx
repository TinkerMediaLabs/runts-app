import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import Feather from '@react-native-vector-icons/feather';
import { audioEngine } from '../audio/audioEngine';
import { tapHaptic } from '../../lib/haptics';
import { useTipTarget } from '../../tips/useTipTarget';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

const SKIP_BACK_SECONDS = 15;
const SKIP_FORWARD_SECONDS = 15;

// The centre play/pause button is hidden for now: the artwork already toggles playback. Flip to true to bring it back.
export default function PlayerControls({ isPlaying, pause, resume, hasNext, onNext, showPlay = false }: any) {
  const tipRef = useTipTarget('player-skip');

  const toggle = async () => {
    tapHaptic();
    if (isPlaying) {
      await audioEngine.pause();
      pause?.();
    } else {
      await audioEngine.resume();
      resume?.();
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.row} ref={tipRef} collapsable={false}>
        {/* Back 15 seconds */}
        <TouchableOpacity
          onPress={() => { tapHaptic(); audioEngine.skipBy(-SKIP_BACK_SECONDS); }}
          activeOpacity={0.7}
          style={styles.skip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Back ${SKIP_BACK_SECONDS} seconds`}
        >
          <Feather name="rotate-ccw" size={44} color={colors.textPrimary} />
          <Text style={styles.skipLabel}>{SKIP_BACK_SECONDS}</Text>
        </TouchableOpacity>

        {/* Play/pause — always centered; hidden unless showPlay */}
        {showPlay ? (
        <TouchableOpacity
          onPress={toggle}
          style={styles.play}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Feather
            name={isPlaying ? 'pause' : 'play'}
            size={36}
            color="#ffff"
          />
        </TouchableOpacity>
        ) : <View style={styles.gap} />}

        {/* Forward 30 seconds */}
        <TouchableOpacity
          onPress={() => { tapHaptic(); audioEngine.skipBy(SKIP_FORWARD_SECONDS); }}
          activeOpacity={0.7}
          style={styles.skip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Forward ${SKIP_FORWARD_SECONDS} seconds`}
        >
          <Feather name="rotate-cw" size={44} color={colors.textPrimary} />
          <Text style={styles.skipLabel}>{SKIP_FORWARD_SECONDS}</Text>
        </TouchableOpacity>
      </View>

      {/* Next — absolutely positioned right, only shown when available */}
      {hasNext && (
        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.7}
          style={styles.next}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Next story"
        >
          <Feather name="skip-forward" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems:     'center',
    marginTop:      0,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  play: {
    paddingHorizontal: 20,
    borderRadius:      40,
  },
  skip: {
    width:          64,
    height:         64,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // The number sits inside the arrow so both skip buttons are the same size and line up with each other.
  skipLabel: {
    position:   'absolute',
    color:      colors.textPrimary,
    fontSize:   fontSizes.small,
    fontWeight: '700',
  },
  gap: { width: 56 },
  next: {
    position: 'absolute',
    right:    0,
  },
});