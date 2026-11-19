import React from 'react';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/common/AppText';
import SectionTitle from '../common/SectionTitle';
import WorldCard, { WorldCardSkeleton } from './WorldCard';
import type { World } from '../../lib/worlds';
import { colors } from '@/theme/colors';
import { fontSizes, layout } from '@/theme/tokens';

const GAP = 14;

// Card size for the Discover preview: one world fills the width; several are a swipeable row with the next card
// peeking in so people can see there is more.
export function worldCardSize(count: number, screenWidth: number) {
  const full = screenWidth - layout.gutter * 2;
  const width = count > 1 ? Math.round(screenWidth * 0.8) : full;
  return { width, height: count > 1 ? Math.round(width * 1.2) : Math.round(full * 0.95) };
}

export const WorldBuildingPlaceholder = () => {
  const { width, height } = worldCardSize(1, Dimensions.get('window').width);
  return (
    <View style={{ marginTop: layout.sectionGap, marginHorizontal: layout.gutter }}>
      <WorldCardSkeleton width={width} height={height} />
    </View>
  );
};

// The World Building row on Discover: a few worlds, large, with the idea of the app in the heading.
const WorldBuilding = ({ worlds, title }: { worlds: World[]; title?: string | null }) => {
  const navigation = useNavigation<any>();
  const screenWidth = Dimensions.get('window').width;
  const { width, height } = worldCardSize(worlds.length, screenWidth);
  if (worlds.length === 0) return null;

  const open = (w: World) => navigation.navigate('TagHomeScreen', { id: w.id, name: w.name });

  return (
    <View style={{ marginTop: layout.sectionGap }}>
      <SectionTitle text={title || 'World Building'} actionLabel="See all" onAction={() => navigation.navigate('Worlds')} />
      <Text style={styles.tagline}>Building worlds through stories</Text>
      <FlatList
        horizontal
        data={worlds}
        keyExtractor={w => w.id}
        renderItem={({ item }) => <WorldCard world={item} width={width} height={height} onPress={() => open(item)} />}
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: GAP }}
        scrollEnabled={worlds.length > 1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tagline: { color: colors.textSecondary, fontSize: fontSizes.small, marginHorizontal: layout.gutter, marginTop: -4, marginBottom: 14 },
});

export default WorldBuilding;
