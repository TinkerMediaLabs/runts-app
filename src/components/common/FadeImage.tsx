import React, { useRef } from 'react';
import { Animated, ImageProps, StyleSheet, View } from 'react-native';

// Image that sits on a dark placeholder and fades in once it has loaded, instead of popping in.
// Drop-in for Image with a fixed-size style. The placeholder stays visible while loading or if the
// image fails.
const FadeImage = ({ style, onLoad, onError, ...rest }: ImageProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  return (
    <View style={[style, { backgroundColor: '#1c1c1e', overflow: 'hidden' }]}>
      <Animated.Image
        {...rest}
        style={[StyleSheet.absoluteFill, { opacity }]}
        onLoad={e => {
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
          onLoad?.(e);
        }}
        onError={e => onError?.(e)}
        fadeDuration={0}
      />
    </View>
  );
};

export default FadeImage;
