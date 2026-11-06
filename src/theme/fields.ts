import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { fontSizes, radius } from './tokens';

// The one look for text fields: dark box, thin border, 16px text, 52px tall.
// Hidden password text: big dots with space between them, so each typed character can be counted. Apply only while
// the field holds text and is hidden, so the placeholder keeps the normal size.
export const passwordDots = {
  fontSize: fontSizes.title,
  letterSpacing: 4,
  paddingVertical: 12,
} as const;

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
