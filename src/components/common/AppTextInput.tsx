import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';
import { resolveFontFamily } from '../../lib/fontUtils';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => {
  const flatStyle = StyleSheet.flatten(props.style) || {};

  if (flatStyle.fontFamily) {
    return <RNTextInput ref={ref} {...props} />;
  }

  const fontFamily = resolveFontFamily(
    flatStyle.fontWeight as string | number | undefined,
    flatStyle.fontStyle as string | undefined
  );

  return <RNTextInput ref={ref} {...props} style={[props.style, { fontFamily }]} />;
});

TextInput.displayName = 'TextInput';

export type TextInput = RNTextInput;