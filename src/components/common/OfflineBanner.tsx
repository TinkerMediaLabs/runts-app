import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useIsOnline } from '../../hooks/useIsOnline';

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
        <FontAwesome5 name="wifi" size={11} color="rgba(255,255,255,0.8)" iconStyle="solid" />
        <Text style={styles.text}>Offline · downloaded stories still play</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(30,30,30,0.95)', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)',
  },
  text: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
});
