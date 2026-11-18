import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

// Tells a listener without Premium that a story is premium (so they know they cannot play it). Premium listeners
// never see it. Marks a premium story on its tile: the word PREMIUM in large letters across the middle of the cover, at 40%
// opacity. Fills the cover (absolute) and never takes touches. `compact` is for tiles with small artwork.
type Props = { compact?: boolean };

export default function PremiumBadge({ compact = false }: Props) {
  const { isPremium } = useApp();
  if (isPremium) return null;
  return (
    <View
      style={styles.overlay}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={compact ? styles.compactText : styles.text}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        PREMIUM
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    opacity: 0.4,
    zIndex: 2,
  },
  text: {
    fontSize: fontSizes.display,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  compactText: {
    fontSize: fontSizes.micro,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
