import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolateColor, cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { useReduceMotion } from '@/lib/useReduceMotion';

// A squiggly line that ripples and shifts colour. It stands in for the progress bar while the player is
// finding the listener's saved place, so nobody drags the bar before the position is ready.
// Built from small rounded segments (no extra native library). With "Reduce Motion" on it stays still.

const STEP = 4;          // distance between segments (they overlap into one continuous line)
const SEG_W = 6;
const SEG_H = 4;
const AMPLITUDE = 6;
const HEIGHT = 28;
const WAVES = 2.5;       // number of full waves across the line

function Segment({ index, count, phase, from, to }: {
  index: number; count: number; phase: SharedValue<number>; from: string; to: string;
}) {
  const style = useAnimatedStyle(() => {
    const along = (index / count) * WAVES * 2 * Math.PI;
    const angle = phase.value * 2 * Math.PI + along;
    const mix = (Math.sin(phase.value * 2 * Math.PI - (index / count) * 3) + 1) / 2;
    return {
      transform: [{ translateY: Math.sin(angle) * AMPLITUDE }],
      backgroundColor: interpolateColor(mix, [0, 1], [from, to]),
    };
  });
  return <Animated.View style={[styles.segment, { left: index * STEP }, style]} />;
}

export default function WavyLoader({ isErotic = false }: { isErotic?: boolean }) {
  const [width, setWidth] = useState(0);
  const phase = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) { cancelAnimation(phase); phase.value = 0; return; }
    phase.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = Math.max(0, Math.floor((width - SEG_W) / STEP) + 1);
  const from = isErotic ? '#ff7c2a' : colors.accent;
  const to   = isErotic ? '#ffd166' : '#a78bfa';

  return (
    <View
      style={styles.box}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
    >
      {Array.from({ length: count }, (_, i) => (
        <Segment key={i} index={i} count={count} phase={phase} from={from} to={to} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, justifyContent: 'center', overflow: 'hidden' },
  segment: {
    position: 'absolute',
    top: (HEIGHT - SEG_H) / 2,
    width: SEG_W,
    height: SEG_H,
    borderRadius: SEG_H / 2,
  },
});
