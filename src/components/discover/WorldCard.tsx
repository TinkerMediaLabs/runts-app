import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/AppText';
import { CachedImage } from '../common/CachedImage';
import Icon from '@/components/common/Icon';
import Skeleton from '../common/Skeleton';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { storiesLabel, type World } from '../../lib/worlds';
import { colors } from '@/theme/colors';
import { fontSizes, radius, iconSize } from '@/theme/tokens';

type Props = { world: World; width: number; height: number; onPress: () => void };

// One world, big: its hero image (else its tile image) full bleed under a dark fade, a WORLD badge, the name in
// heavy capitals, the description, and the story count with an "Enter" cue. Used in the Discover preview and on the
// Worlds page, so a world looks the same everywhere.
const WorldCard = ({ world, width, height, onPress }: Props) => {
  const art = world.heroImageUri || world.tileImageUri || null;
  const { data: uri } = useStoryImage(art);
  const image = uri ?? (art && !art.startsWith('stories/') ? art : null);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={[styles.card, { width, height }]}
      accessibilityRole="button"
      accessibilityLabel={`${world.name}, world, ${storiesLabel(world.storyCount)}${world.description ? `. ${world.description}` : ''}`}
      accessibilityHint="Opens this world"
    >
      {image ? (
        <CachedImage source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <LinearGradient colors={['#0d3a40', '#07151a', '#000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.bigGlobe} pointerEvents="none"><Icon name="globe" size={150} color="rgba(0,255,255,0.10)" /></View>
        </>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.3, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.badge}>
        <Icon name="globe" size={iconSize.xs} color={colors.accent} />
        <Text style={styles.badgeText}>WORLD</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.name} numberOfLines={2}>{world.name.toUpperCase()}</Text>
        {world.description ? <Text style={styles.description} numberOfLines={3}>{world.description}</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.count}>{storiesLabel(world.storyCount)}</Text>
          <View style={styles.enter}>
            <Text style={styles.enterText}>Enter</Text>
            <Icon name="chevron-right" size={iconSize.xs} color={colors.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const WorldCardSkeleton = ({ width, height }: { width: number; height: number }) => (
  <Skeleton width={width} height={height} radius={radius.xl} />
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#07151a',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.22)',
    justifyContent: 'space-between',
  },
  bigGlobe: { position: 'absolute', right: -20, top: 30 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    margin: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,255,255,0.4)',
  },
  badgeText: { color: colors.accent, fontSize: fontSizes.micro, fontWeight: '800', letterSpacing: 1.6 },
  bottom: { padding: 18, gap: 8 },
  name: { color: colors.textPrimary, fontSize: fontSizes.headline, fontWeight: '900', letterSpacing: 1 },
  description: { color: colors.textStrong, fontSize: fontSizes.small, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  count: { color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: '600' },
  enter: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: 'rgba(0,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,255,255,0.45)',
  },
  enterText: { color: colors.accent, fontSize: fontSizes.caption, fontWeight: '700' },
});

export default WorldCard;
