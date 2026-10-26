import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image, ImageProps, ImageSource } from 'expo-image';

// Cover/avatar image with a disk + memory cache, a dark placeholder while loading, and a short fade-in.
// Same props as React Native's Image (resizeMode works), built on expo-image.
//
// Signed S3 links change their query string every time they are re-signed, which would make every image
// look "new" to the cache. For http(s) links with a query string we cache under the URL without the query,
// so the same cover is only downloaded once however often its link is re-signed.

type ResizeMode = 'cover' | 'contain' | 'stretch' | 'center';
const FIT: Record<ResizeMode, 'cover' | 'contain' | 'fill' | 'none'> = {
  cover: 'cover', contain: 'contain', stretch: 'fill', center: 'none',
};
export const PLACEHOLDER_BG = '#1c1c1e';

function withCacheKey(source: ImageProps['source']): ImageProps['source'] {
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const s = source as ImageSource;
    if (s.uri && /^https?:/.test(s.uri) && s.uri.includes('?') && !s.cacheKey) {
      return { ...s, cacheKey: s.uri.split('?')[0] };
    }
  }
  return source;
}

export type CachedImageProps = Omit<ImageProps, 'contentFit'> & {
  resizeMode?: ResizeMode;
  contentFit?: ImageProps['contentFit'];
};

export const CachedImage = ({ source, style, resizeMode, contentFit, ...rest }: CachedImageProps) => (
  <Image
    {...rest}
    source={withCacheKey(source)}
    style={[{ backgroundColor: PLACEHOLDER_BG }, style]}
    contentFit={contentFit ?? FIT[resizeMode ?? 'cover']}
    cachePolicy="memory-disk"
    transition={200}
  />
);

// Drop-in for React Native's ImageBackground: `style` sizes the box, `imageStyle` styles the picture.
export const CachedImageBackground = ({
  source, style, imageStyle, children, resizeMode,
}: {
  source: ImageProps['source'];
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: React.ReactNode;
  resizeMode?: ResizeMode;
}) => (
  <View style={style}>
    <CachedImage source={source} resizeMode={resizeMode} style={[StyleSheet.absoluteFill, imageStyle as any]} />
    {children}
  </View>
);

export default CachedImage;
