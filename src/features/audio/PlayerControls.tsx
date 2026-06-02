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

      <TouchableOpacity onPress={toggle} style={styles.play}>
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={36}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Next — only shown when there is a next track */}
      {hasNext ? (
        <TouchableOpacity onPress={onNext} activeOpacity={0.7}>
          <Feather name="skip-forward" size={28} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 28 }} />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    gap: 30,
  },
  play: {
    paddingHorizontal: 20,
    borderRadius: 40,
  },
});