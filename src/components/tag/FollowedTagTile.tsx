import React from 'react';
import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/AppText';
import useTypography from '../../theme/typography';
import { CachedImageBackground } from '../common/CachedImage';
import { localAssets } from '../story/PrimaryGenreTiles';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { tagTileColors, tileInitial } from '@/lib/tagTileColors';
import { Analytics } from '@/lib/analytics';
import NewDot from '../common/NewDot';
import { navigate } from '@/navigation/RootNavigator';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';

const { width } = Dimensions.get('window');
const TILE_HEIGHT = 160;   // same as the primary genre tiles

// A followed genre as a full-width tile, the same size and feel as the primary genre tiles. With a picture it looks
// like them. Without one (most genres) it gets a deep gradient, a big faint initial and the story count, so it
// still looks designed rather than empty.
const FollowedTagTile = ({ tag, hasNew = false }: { tag: any; hasNew?: boolean }) => {
  const typo = useTypography();
  const key: string | null = tag.tileImageUri ?? tag.heroImageUri ?? tag.imageUri ?? null;
  const local = key && localAssets[key] ? localAssets[key] : null;
  const { data: resolved } = useStoryImage(!local && key ? key : null);
  const source = local ?? (resolved ? { uri: resolved } : null);

  const count = tag.storyCount ?? 0;
  const countLabel = count > 0 ? `${count} ${count === 1 ? 'story' : 'stories'}` : null;
  const [from, to] = tagTileColors(tag.id, tag.color);

  const open = () => {
    Analytics.genreTapped(tag.id, tag.name);
    navigate('TagHomeScreen', { id: tag.id, name: tag.name });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={open}
      style={styles.wrapper}
      accessibilityRole="button"
      accessibilityLabel={`Genre ${tag.name}${countLabel ? `, ${countLabel}` : ''}${hasNew ? ', new stories' : ''}`}
    >
      {hasNew ? <NewDot style={{ zIndex: 2 }} /> : null}
      {source ? (
        <CachedImageBackground source={source} style={styles.tile} imageStyle={{ borderRadius: radius.lg }}>
          <LinearGradient
            colors={['#000000a5', '#000000a5', 'transparent']}
            locations={[0.0, 0.33, 1.0]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.gradient}
          >
            {countLabel ? <Text style={styles.count}>{countLabel}</Text> : null}
            <Text style={[typo.genreTile, styles.name]}>{tag.name}</Text>
          </LinearGradient>
        </CachedImageBackground>
      ) : (
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, styles.plain]}>
          <Text style={styles.initial} accessibilityElementsHidden importantForAccessibility="no">{tileInitial(tag.name)}</Text>
          <View>
            {countLabel ? <Text style={styles.count}>{countLabel}</Text> : null}
            <Text style={[typo.genreTile, styles.name]}>{tag.name}</Text>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

export default React.memo(FollowedTagTile);

const styles = StyleSheet.create({
  wrapper:  { marginVertical: 10, width: width - 40, alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden' },
  tile:     { width: '100%', height: TILE_HEIGHT, borderRadius: radius.lg, justifyContent: 'flex-end' },
  // On top of a picture: fills the picture tile. (A percentage height is only safe here, where the parent has a height.)
  gradient: { width: '100%', height: '100%', borderRadius: radius.lg, justifyContent: 'flex-end', paddingBottom: 10, overflow: 'hidden' },
  // The no-picture tile is itself the gradient, so it uses the fixed tile height and no percentage.
  plain:    { paddingBottom: 10, overflow: 'hidden' },
  name:     { marginBottom: 0 },
  count:    { color: colors.textStrong, fontSize: fontSizes.caption, fontWeight: '600', paddingHorizontal: 20, marginBottom: 2 },
  initial:  { position: 'absolute', right: 14, top: -22, fontSize: TILE_HEIGHT * 0.94, fontWeight: '900', color: colors.fillStrong, opacity: 0.55 },
});
