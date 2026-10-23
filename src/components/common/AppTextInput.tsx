import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';
import { resolveFontFamily } from '../../lib/fontUtils';
import { MAX_FONT_SCALE } from './AppText';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => {
  const flatStyle = StyleSheet.flatten(props.style) || {};

  if (flatStyle.fontFamily) {
    return <RNTextInput ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
  }

  const fontFamily = resolveFontFamily(
    flatStyle.fontWeight as string | number | undefined,
    flatStyle.fontStyle as string | undefined
  );

  return <RNTextInput ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={[props.style, { fontFamily }]} />;
});

TextInput.displayName = 'TextInput';

export type TextInput = RNTextInput;