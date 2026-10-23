import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '@/lib/useReduceMotion';

// A soft cyan glow along the bottom of the player hero that slowly breathes while a story plays.
// Paused: dim and still. Reduce Motion: steady, no breathing.
export default function PlaybackGlow({ active }: { active: boolean }) {
    const reduceMotion = useReduceMotion();
    const level = useSharedValue(0.2);

    useEffect(() => {
        cancelAnimation(level);
        if (!active) { level.value = withTiming(0.2, { duration: 600 }); return; }
        if (reduceMotion) { level.value = 0.55; return; }
        level.value = withRepeat(
            withSequence(
                withTiming(0.9, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.4, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
        );
        return () => cancelAnimation(level);
    }, [active, reduceMotion]);

    const style = useAnimatedStyle(() => ({ opacity: level.value }));

    return (
        <Animated.View pointerEvents="none" style={[styles.wrap, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <LinearGradient colors={['transparent', 'rgba(0,255,255,0.22)']} style={StyleSheet.absoluteFill} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },
});
