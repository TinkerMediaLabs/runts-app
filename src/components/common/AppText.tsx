import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { resolveFontFamily } from '../../lib/fontUtils';

// Largest text size (as a multiple of normal) the app will grow to when the phone's text size is increased.
// Keeps layouts intact while still honoring larger text. Pass maxFontSizeMultiplier on a Text to override.
export const MAX_FONT_SCALE = 1.6;

export const Text = React.forwardRef<RNText, TextProps>((props, ref) => {
  const flatStyle = StyleSheet.flatten(props.style) || {};

  if (flatStyle.fontFamily) {
    // Respect any component that already sets its own fontFamily explicitly
    return <RNText ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
  }

  const fontFamily = resolveFontFamily(
    flatStyle.fontWeight as string | number | undefined,
    flatStyle.fontStyle as string | undefined
  );

  return <RNText ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={[props.style, { fontFamily }]} />;
});

Text.displayName = 'Text';
