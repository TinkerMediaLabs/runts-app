import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { resolveFontFamily } from '../../lib/fontUtils';

export const Text = React.forwardRef<RNText, TextProps>((props, ref) => {
  const flatStyle = StyleSheet.flatten(props.style) || {};

  if (flatStyle.fontFamily) {
    // Respect any component that already sets its own fontFamily explicitly
    return <RNText ref={ref} {...props} />;
  }

  const fontFamily = resolveFontFamily(
    flatStyle.fontWeight as string | number | undefined,
    flatStyle.fontStyle as string | undefined
  );

  return <RNText ref={ref} {...props} style={[props.style, { fontFamily }]} />;
});

Text.displayName = 'Text';
