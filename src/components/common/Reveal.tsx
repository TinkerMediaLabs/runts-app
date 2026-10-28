import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Fade-and-rise when a section first appears. `index` staggers sections so a screen settles
// top to bottom. Reanimated skips entering animations when the phone's Reduce Motion is on.
export default function Reveal({ index = 0, style, children, duration = 450 }: { index?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode; duration?: number }) {
    return (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(duration)} style={style}>
            {children}
        </Animated.View>
    );
}
