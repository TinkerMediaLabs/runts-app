import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import Icon from '@/components/common/Icon';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: any;
};

// The app's one filter pill (Discover search and the pinned list share it): quiet when off, accent when a filter is set.
export default function FilterChip({ label, active, onPress, icon }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {icon ? <Icon name={icon} size={10} color={active ? '#000' : colors.textSecondary} style={{ marginRight: 5 }} /> : null}
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { fontSize: fontSizes.caption, fontWeight: '600', color: colors.textSecondary },
  textActive: { color: colors.textOnAccent },
});
