import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Dimensions, DimensionValue } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { radius as radii } from '@/theme/tokens';
import { spacing } from '@/theme/spacing';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// One quiet placeholder for everything that is still loading: a dark block that slowly breathes. It runs on the
// native animation thread (Reanimated), and with Reduce Motion on it stays still. The ready-made shapes below mirror
// the real layouts (same widths, heights and gutters) so content replaces them without anything jumping.

type BlockProps = { width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> };

export const Skeleton = ({ width = '100%', height, radius = radii.md, style }: BlockProps) => {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(reduceMotion ? 0.7 : 0.45);

  useEffect(() => {
    if (reduceMotion) { pulse.value = 0.7; return; }
    pulse.value = withRepeat(withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduceMotion, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface3 }, animated, style]}
    />
  );
};

// Screen readers hear one "Loading" instead of a pile of empty blocks.
const Group = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View
    style={style}
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel="Loading"
    importantForAccessibility="yes"
  >
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{children}</View>
  </View>
);

/** A heading line, indented like a section title. */
export const SkeletonTitle = ({ width = 150 }: { width?: number }) => (
  <Skeleton width={width} height={18} radius={radii.sm} style={styles.title} />
);

/** Rows like the story tiles on Playlist, History and search results. */
export const SkeletonRows = ({ count = 6 }: { count?: number }) => (
  <Group style={styles.rowsWrap}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.row}>
        <Skeleton width={60} height={60} radius={radii.md} />
        <View style={styles.rowText}>
          <Skeleton width="70%" height={14} radius={radii.sm} />
          <Skeleton width="45%" height={12} radius={radii.sm} style={{ marginTop: 10 }} />
        </View>
      </View>
    ))}
  </Group>
);

/** A titled horizontal row of cards (Home rows use 200 wide story cards, Discover uses 156 by 100 subgenre cards). */
export const SkeletonCardRow = ({
  cardWidth = 200, cardHeight = 200, titleWidth = 150, count = 3,
}: { cardWidth?: number; cardHeight?: number; titleWidth?: number; count?: number }) => (
  <Group style={styles.section}>
    <SkeletonTitle width={titleWidth} />
    <View style={styles.cardRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          <Skeleton width={cardWidth} height={cardHeight} radius={radii.lg} />
          {cardHeight > 120 ? <Skeleton width={cardWidth * 0.7} height={12} radius={radii.sm} style={{ marginTop: 10 }} /> : null}
        </View>
      ))}
    </View>
  </Group>
);

/** The For You carousel card (same size as the real card). */
export const SkeletonCarousel = () => (
  <Group style={styles.carousel}>
    <Skeleton width={SCREEN_W * 0.9} height={SCREEN_H * 0.4} radius={radii.lg} />
  </Group>
);

/** The big genre tiles on Discover (full width, 160 high). */
export const SkeletonGenreTiles = ({ count = 2 }: { count?: number }) => (
  <Group style={styles.genres}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} width={SCREEN_W - spacing.margin * 2} height={160} radius={radii.lg} style={styles.genreTile} />
    ))}
  </Group>
);

/** Story page: hero image, title, a line of details, the play button and some text. */
export const SkeletonStoryPage = () => (
  <Group>
    <Skeleton width={SCREEN_W} height={SCREEN_H * 0.42} radius={0} />
    <View style={styles.pageBody}>
      <Skeleton width="70%" height={26} radius={radii.sm} />
      <Skeleton width="40%" height={14} radius={radii.sm} style={{ marginTop: 14 }} />
      <Skeleton width="100%" height={52} radius={radii.lg} style={{ marginTop: 28 }} />
      <Skeleton width="100%" height={12} radius={radii.sm} style={{ marginTop: 28 }} />
      <Skeleton width="92%" height={12} radius={radii.sm} style={{ marginTop: 10 }} />
      <Skeleton width="60%" height={12} radius={radii.sm} style={{ marginTop: 10 }} />
    </View>
  </Group>
);

/** Author page: round photo, name, a short bio, then story rows. */
export const SkeletonAuthorPage = () => (
  <Group style={styles.authorWrap}>
    <Skeleton width={96} height={96} radius={48} />
    <Skeleton width={160} height={22} radius={radii.sm} style={{ marginTop: 16 }} />
    <Skeleton width={220} height={12} radius={radii.sm} style={{ marginTop: 14 }} />
    <Skeleton width={180} height={12} radius={radii.sm} style={{ marginTop: 8 }} />
    <View style={{ alignSelf: 'stretch', marginTop: 28 }}>
      <SkeletonRows count={4} />
    </View>
  </Group>
);

const styles = StyleSheet.create({
  title: { marginHorizontal: spacing.margin, marginBottom: 12 },
  rowsWrap: { paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 6, padding: 10 },
  rowText: { flex: 1, marginLeft: 14 },
  section: { marginTop: 24 },
  cardRow: { flexDirection: 'row', paddingHorizontal: spacing.margin, gap: 10 },
  carousel: { alignItems: 'center', marginTop: 8 },
  genres: { paddingHorizontal: spacing.margin },
  genreTile: { marginVertical: 10 },
  pageBody: { paddingHorizontal: spacing.margin, paddingTop: 24 },
  authorWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.margin },
});

export default Skeleton;
