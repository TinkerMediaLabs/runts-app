import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

// A small turquoise dot: "something new here". Decorative; the row's accessibility label says what is new.
const NewDot = ({ size = 12, style }: { size?: number; style?: StyleProp<ViewStyle> }) => (
  <View
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, style]}
  />
);

const styles = StyleSheet.create({
  dot: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.accent, borderWidth: 2, borderColor: 'rgba(0,0,0,0.5)' },
});

export default NewDot;
