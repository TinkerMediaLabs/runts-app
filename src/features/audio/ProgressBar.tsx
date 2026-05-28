import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { Slider, SliderThemeType } from 'react-native-awesome-slider';
import {
  useSharedValue,
  runOnJS,
  useDerivedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

import { audioEngine } from './audioEngine';

const SLIDER_UPDATE_MS = 500; // update slider at most every 500ms

export default function ProgressBar({ progress }: any) {

  // Throttled value fed to the Slider — only updates every SLIDER_UPDATE_MS.
  // This breaks the rapid-fire re-render loop that causes the duplicate key bug
  // in react-native-awesome-slider v2.9.0.
  const sliderProgress = useSharedValue(0);
  const lastUpdateTime = useSharedValue(0);

  const min = useSharedValue(0);
  const max = useSharedValue(1);
  const isSliding = useSharedValue(0);
  const [isSlidingState, setIsSlidingState] = useState(false);

  // Sync max from incoming progress on JS side (only changes when track changes)
  useEffect(() => {
    max.value = progress.duration || 1;
  }, [progress.duration]);

  // Throttled worklet reaction — runs on UI thread whenever progress.position changes.
  // Only pushes a new value to sliderProgress if enough time has passed.
  useAnimatedReaction(
    () => progress.position,
    (current) => {
      'worklet';
      const now = Date.now();
      if (now - lastUpdateTime.value >= SLIDER_UPDATE_MS) {
        lastUpdateTime.value = now;
        if (!isSliding.value) {
          sliderProgress.value = current;
        }
        // Also keep max in sync on worklet thread
        if (progress.duration > 0) {
          max.value = progress.duration;
        }
      }
    }
  );

  const format = (s: number) => {
    'worklet';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const [displayPosition, setDisplayPosition] = useState('0:00');
  const [displayDuration, setDisplayDuration] = useState('0:00');

  // Drive the time labels from the throttled value so they match the slider
  useDerivedValue(() => {
    runOnJS(setDisplayPosition)(format(sliderProgress.value));
    runOnJS(setDisplayDuration)(format(max.value));
  });

  const [bubbleTime, setBubbleTime] = useState('0:00');
  const bubbleValue = useSharedValue(0);

  useDerivedValue(() => {
    runOnJS(setBubbleTime)(format(bubbleValue.value));
  });

  return (
    <View style={styles.container}>
      <Slider
        progress={sliderProgress}
        minimumValue={min}
        maximumValue={max}

        onSlidingStart={() => {
          isSliding.value = 1;
          setIsSlidingState(true);
        }}

        onValueChange={(value) => {
          'worklet';
          bubbleValue.value = value;
          sliderProgress.value = value;
        }}

        onSlidingComplete={(value) => {
          isSliding.value = 0;
          setIsSlidingState(false);
          audioEngine.seek?.(value);
        }}

        thumbWidth={10}
        renderThumb={() => <View style={styles.customThumb} />}
        renderBubble={() =>
          isSlidingState ? (
            <View style={styles.customBubble}>
              <Text>{bubbleTime}</Text>
            </View>
          ) : null
        }
        theme={{
          maximumTrackTintColor: '#2a2a2a',
          minimumTrackTintColor: '#00ffff',
          bubbleBackgroundColor: '#000',
          bubbleTextColor: '#fff',
          cacheTrackTintColor: 'rgba(255,255,255,0.2)',
        }}
      />

      <View style={styles.row}>
        <Text style={styles.time}>{displayPosition}</Text>
        <Text style={styles.time}>{displayDuration}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  time: {
    color: '#aaa',
    fontSize: 24,
    fontWeight: 'bold',
  },
  customThumb: {
    width: 14,
    height: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'cyan',
  },
  customBubble: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});