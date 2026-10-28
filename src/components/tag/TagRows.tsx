import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Reveal from '../common/Reveal';
import ForYouCarousel from '../story/ForYouCarousel';
import HorizontalList from '../story/HorizontalList';
import { FeaturedAuthorSection, HandPickedSection } from '../home/HomeSectionView';
import { SubgenreRow } from '../discover/DiscoverSections';
import type { TagRow } from '../../lib/tagLayout';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import SectionTitle from '@/components/common/SectionTitle';
import { spacing } from '../../theme/spacing';

const DEFAULT_TITLES: Record<string, string> = {
  tagTrending: 'Trending this week',
  tagPopular: 'Most listened',
  tagNew: 'New',
  tagShort: 'Short & Sweet',
  tagMoreLike: 'If you like this',
};

// Other genres that share many stories with this one, as the same cards the Discover tab uses.
const RelatedGenres = ({ tags, index, title }: { tags: any[]; index: number; title?: string | null }) => {
  const list = React.useMemo(() => tags.map(t => ({ id: t.id, name: t.name, liveCount: 0 })), [tags]);
  if (!list.length) return null;
  return (
    <Reveal index={index}>
      <SubgenreRow title={title || 'Related genres'} tags={list} top={24} />
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
  chips: { paddingHorizontal: spacing.margin, gap: 10, paddingBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, backgroundColor: colors.fillFaint,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: colors.textPrimary, fontSize: fontSizes.small, fontWeight: '600', textTransform: 'capitalize', maxWidth: 160 },
});
