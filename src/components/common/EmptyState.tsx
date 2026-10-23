import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/common/AppText';

type Props = {
  icon: React.ReactNode;
  title: string;
  body: string;
  // Optional step the listener can take right now.
  actionLabel?: string;
  onAction?: () => void;
};

// A friendly empty screen: what this place is for, how to fill it, and a button to start.
export default function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 70, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 21 },
  button: {
    marginTop: 8, minHeight: 48, paddingHorizontal: 24, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'cyan', backgroundColor: 'rgba(0,255,255,0.08)',
  },
  buttonText: { color: 'cyan', fontSize: 15, fontWeight: '600' },
});
