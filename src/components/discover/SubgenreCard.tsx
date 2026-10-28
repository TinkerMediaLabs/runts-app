import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { CachedImage } from '../common/CachedImage';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { letterOf } from '../../lib/discoverTags';
import { Analytics } from '@/lib/analytics';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';

export const CARD_W = 156;
export const CARD_H = 100;   // minimum height: cards grow with the user's font size instead of clipping

// A subgenre card. With an image: the picture with the name over a dark fade. Without one: a dark card with a big
// faint first letter behind the name (no tag colours are used). `image` is the genre's tile image, else its image.
const SubgenreCard = ({ id, name, image, liveCount, width = CARD_W, height = CARD_H }: {
  id: string; name: string; image?: string | null; liveCount?: number; width?: number; height?: number;
}) => {
  const navigation = useNavigation<any>();
  const { data: uri } = useStoryImage(image ?? null);
  const count = liveCount && liveCount > 0 ? `${liveCount} ${liveCount === 1 ? 'story' : 'stories'}` : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { Analytics.genreTapped(id, name); navigation.push('TagHomeScreen', { id, name }); }}
      style={[styles.card, { width, minHeight: height }]}
      accessibilityRole="button"
      accessibilityLabel={count ? `${name}, subgenre, ${count}` : `${name}, subgenre`}
      accessibilityHint="Opens this subgenre"
    >
      {uri ? (
        <>
          <CachedImage source={{ uri }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', '#000000cc']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.2 }} end={{ x: 0, y: 1 }} />
        </>
      ) : (
        <>
          <LinearGradient colors={['#20262b', '#101315']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={styles.letter} accessible={false} importantForAccessibility="no" accessibilityElementsHidden>{letterOf(name)}</Text>
        </>
      )}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle, backgroundColor: '#15181a',
  },
  letter: {
    position: 'absolute', right: 8, top: -14, fontSize: 92, fontWeight: '800', color: colors.textPrimary, opacity: 0.07,
  },
  text: { padding: 10, gap: 2 },
  name: { fontSize: fontSizes.body, fontWeight: '700', color: colors.textPrimary },
  count: { fontSize: fontSizes.micro, color: colors.textSecondary },
});

export default React.memo(SubgenreCard);
