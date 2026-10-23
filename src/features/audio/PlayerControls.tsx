import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import Feather from '@expo/vector-icons/Feather';
import { audioEngine } from '../audio/audioEngine';

const SKIP_BACK_SECONDS = 15;
const SKIP_FORWARD_SECONDS = 30;

export default function PlayerControls({ isPlaying, pause, resume, hasNext, onNext }: any) {

  const toggle = async () => {
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

      <View style={styles.row}>
        {/* Back 15 seconds */}
        <TouchableOpacity
          onPress={() => audioEngine.skipBy(-SKIP_BACK_SECONDS)}
          activeOpacity={0.7}
          style={styles.skip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Back ${SKIP_BACK_SECONDS} seconds`}
        >
          <Feather name="rotate-ccw" size={28} color="#fff" />
          <Text style={styles.skipLabel}>{SKIP_BACK_SECONDS}</Text>
        </TouchableOpacity>

        {/* Play/pause — always centered */}
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

        {/* Forward 30 seconds */}
        <TouchableOpacity
          onPress={() => audioEngine.skipBy(SKIP_FORWARD_SECONDS)}
          activeOpacity={0.7}
          style={styles.skip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Forward ${SKIP_FORWARD_SECONDS} seconds`}
        >
          <Feather name="rotate-cw" size={28} color="#fff" />
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
          <Feather name="skip-forward" size={28} color="#fff" />
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
    alignItems:        'center',
    paddingHorizontal: 12,
  },
  skipLabel: {
    color:    'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  next: {
    position: 'absolute',
    right:    0,
  },
});