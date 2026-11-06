import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useIsOnline } from '../../hooks/useIsOnline';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

// Small notice at the top while the phone has no connection. Announced once to screen readers.
export default function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 6 }]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel="You're offline. Downloaded stories still play."
    >
      <View style={styles.pill}>
        <FontAwesome5 name="wifi" size={iconSize.xs} color={colors.textStrong} iconStyle="solid" />
        <Text style={styles.text}>Offline · downloaded stories still play</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(30,30,30,0.95)', borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  text: { color: colors.textStrong, fontSize: fontSizes.caption },
});
