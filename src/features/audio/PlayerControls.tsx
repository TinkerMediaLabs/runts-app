import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { audioEngine } from '../audio/audioEngine';

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

      {/* Play/pause — always centered */}
      <TouchableOpacity onPress={toggle} style={styles.play}>
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={36}
          color="#ffff"
        />
      </TouchableOpacity>

      {/* Next — absolutely positioned right, only shown when available */}
      {hasNext && (
        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.7}
          style={styles.next}
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
  play: {
    paddingHorizontal: 20,
    borderRadius:      40,
  },
  next: {
    position: 'absolute',
    right:    0,
  },
});