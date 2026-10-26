import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/common/AppText';

import Reveal from '../common/Reveal';
import ForYouCarousel from '../story/ForYouCarousel';
import HorizontalList from '../story/HorizontalList';
import { FeaturedAuthorSection, HandPickedSection } from '../home/HomeSectionView';
import useTypography from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { TagRow } from '../../lib/tagLayout';

const DEFAULT_TITLES: Record<string, string> = {
  tagTrending: 'Trending this week',
  tagPopular: 'Most listened',
  tagNew: 'New',
  tagShort: 'Short & Sweet',
  tagMoreLike: 'If you like this',
};

const SectionTitle = ({ text }: { text: string }) => {
  const typo = useTypography();
  return (
    <View style={styles.titleWrap}>
      <Text style={typo.title} accessibilityRole="header">{text}</Text>
    </View>
  );
};

// Other genres that share many stories with this one, as tappable tiles.
const RelatedGenres = ({ tags, index, title }: { tags: any[]; index: number; title?: string | null }) => {
  const navigation = useNavigation<any>();
  if (!tags.length) return null;
  return (
    <Reveal index={index}>
      <SectionTitle text={title || 'Related genres'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {tags.map(tag => {
          const color = tag.color ?? '#00ffff';
          return (
            <TouchableOpacity
              key={tag.id}
              activeOpacity={0.8}
              onPress={() => navigation.push('TagHomeScreen', { id: tag.id, name: tag.name })}
              style={[styles.chip, { borderColor: color }]}
              accessibilityRole="button"
              accessibilityLabel={`${tag.name} genre`}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.chipText} numberOfLines={1}>{tag.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Reveal>
  );
};

type Props = { row: TagRow; index: number; tagMap: Record<string, string>; relatedTags: any[] };

// One horizontal block of the Tag Home screen. (The vertical "all stories" list is drawn by the screen itself.)
const TagRowView = ({ row, index, tagMap, relatedTags }: Props) => {
  const { section } = row;
  switch (row.type) {
    case 'tagFeatured':
      return <Reveal index={index}><ForYouCarousel stories={row.stories} tagMap={tagMap} /></Reveal>;
    case 'tagRelated':
      return <RelatedGenres tags={relatedTags} index={index} title={section.title} />;
    case 'featuredAuthor':
      return <FeaturedAuthorSection section={section as any} index={index} />;
    case 'handPicked':
      return <HandPickedSection section={section as any} index={index} />;
    case 'tagAll': case 'tagBrowseAll':
      return null;
    default:
      return (
        <Reveal index={index}>
          <SectionTitle text={section.title || row.title || DEFAULT_TITLES[row.type] || ''} />
          <HorizontalList stories={row.stories} showSeeMore={false} />
        </Reveal>
      );
  }
};

export default TagRowView;

const styles = StyleSheet.create({
  titleWrap: { marginLeft: spacing.margin, paddingVertical: spacing.margin },
  chips: { paddingHorizontal: spacing.margin, gap: 10, paddingBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '600', textTransform: 'capitalize', maxWidth: 160 },
});
