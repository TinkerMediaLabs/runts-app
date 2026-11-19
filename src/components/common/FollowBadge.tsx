import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import Icon from '@/components/common/Icon';

// The "you follow this tag" mark on a tag tile: a small turquoise circle with a filled heart, in the tile's top-right corner.
// Pair it with useIsTagFollowed(tagId) and show it only on followed tags. Large tiles use the default size, small
// tiles pass a smaller one. Decorative: the tile's own accessibility label says "following".
const FollowBadge = ({ size = 22, style }: { size?: number; style?: StyleProp<ViewStyle> }) => (
  <View
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }, style]}
  >
    <Icon name="heart" size={Math.round(size * 0.62)} color={colors.textOnAccent} weight="fill" />
  </View>
);

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
});

export default FollowBadge;
