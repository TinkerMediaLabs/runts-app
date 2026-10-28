import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { fontSizes, radius } from './tokens';

// The one look for text fields: dark box, thin border, 16px text, 52px tall.
export const fields = StyleSheet.create({
  box: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  boxFocused: {
    borderColor: 'rgba(0,255,255,0.35)',
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    paddingVertical: 14,
  },
});
