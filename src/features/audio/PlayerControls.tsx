import React, {useState} from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {audioEngine} from '../audio/audioEngine'

export default function PlayerControls({ isPlaying, pause, resume }: any) {

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

      <TouchableOpacity>
        <Feather name="skip-back" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity onPress={toggle} style={styles.play}>
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={36}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity>
        <Feather name="skip-forward" size={28} color="#fff" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  play: {
    marginHorizontal: 30,
    paddingHorizontal: 20,
    borderRadius: 40,
  },
});