import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from '@/components/common/AppText';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/tokens';
import { fontSizes } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'outline';
  size?: 'large' | 'small';
  loading?: boolean;
  disabled?: boolean;
  /** Soft cyan glow under a primary button (sign-in flow). */
  glow?: boolean;
  /** Shown after the label (e.g. an arrow icon). */
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// The one button. primary = cyan, secondary = dark grey, danger = solid red, outline = cyan border (Follow), text = no background (Cancel).
const Button = ({ label, onPress, variant = 'primary', size = 'large', loading, disabled, glow, icon, accessibilityLabel, style }: Props) => {
  const off = !!disabled || !!loading;
  const v = VARIANTS[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={off}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={loading ? `${accessibilityLabel ?? label}, please wait` : (accessibilityLabel ?? label)}
      accessibilityState={{ disabled: off, busy: !!loading }}
      style={[styles.base, size === 'large' ? styles.large : styles.small, v.box, glow && variant === 'primary' && styles.glow, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          <Text style={[size === 'large' ? styles.labelLarge : styles.labelSmall, { color: v.text }]}>{label}</Text>
          {icon}
        </>
      )}
    </TouchableOpacity>
  );
};

const VARIANTS = {
  primary: { box: { backgroundColor: colors.accent }, text: colors.textOnAccent },
  secondary: { box: { backgroundColor: colors.surface3 }, text: colors.textPrimary },
  danger: { box: { backgroundColor: colors.dangerSolid }, text: colors.textPrimary },
  text: { box: {}, text: colors.textSecondary },
  outline: { box: { borderWidth: 1, borderColor: colors.accent }, text: colors.accent },
} as const;

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  large: { borderRadius: radius.lg, paddingVertical: 16, minHeight: 54 },
  small: { borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  disabled: { opacity: 0.35 },
  glow: { shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  labelLarge: { fontSize: fontSizes.subtitle, fontWeight: '800', letterSpacing: 0.2 },
  labelSmall: { fontSize: fontSizes.small, fontWeight: '700' },
});

export default Button;
