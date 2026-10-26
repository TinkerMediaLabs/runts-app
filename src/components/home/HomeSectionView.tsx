import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/common/AppText';
import { useApp } from '@/context/AppContext';

import Reveal from '../common/Reveal';
import { CachedImage } from '../common/CachedImage';
import ForYouCarousel from '../story/ForYouCarousel';
import HorizontalList from '../story/HorizontalList';
import ContinueListening from '../story/ContinueListening';
import BecauseYouFinished from '../story/BecauseYouFinished';
import TagRow from '../story/TagRow';

import { useForYouStories } from '../../hooks/queries/useForYouStories';
import { useEnrichedStories } from '../../hooks/queries/useEnrichedStories';
import { useStories } from '../../hooks/queries/useStories';
import { useStoriesByIds } from '../../hooks/queries/useStoriesByIds';
import { useAuthorNewest } from '../../hooks/queries/useAuthorNewest';
import { useAuthor } from '../../hooks/queries/useAuthors';
import { useAuthorImage } from '../../hooks/queries/useAuthorImage';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import { Analytics } from '../../lib/analytics';
import type { HomeSectionRow } from '../../lib/homeLayout';
import useTypography from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Props = { section: HomeSectionRow; index: number };

const SectionTitle = ({ text }: { text: string }) => {
  const typo = useTypography();
  return (
    <View style={styles.titleWrap}>
      <Text style={typo.title} accessibilityRole="header">{text}</Text>
    </View>
  );
};

// A plain row of stories under a title (new, hand-picked).
const StoryRow = ({ title, stories, index }: { title: string; stories: any[]; index: number }) => {
  const { stories: enriched } = useEnrichedStories(stories);
  if (enriched.length === 0) return null;
  return (
    <Reveal index={index}>
      <SectionTitle text={title} />
      <HorizontalList stories={enriched} showSeeMore={false} />
    </Reveal>
  );
};

const ForYouSection = ({ section, index }: Props) => {
  const { profile } = useApp();
  const preferred = useMemo(() => profile?.preferredTagIds ?? [], [profile?.preferredTagIds]);
  const { data } = useForYouStories(preferred, section.limit ?? 8);
  const { stories, tagMap } = useEnrichedStories(data);
  if (stories.length === 0) return null;
  return (
    <Reveal index={index}>
      <ForYouCarousel stories={stories} tagMap={tagMap} />
    </Reveal>
  );
};

// The listener's picked genres first, then the first other genres, up to `limit` rows.
const GenresSection = ({ section, index }: Props) => {
  const { profile } = useApp();
  const { data: tags } = usePrimaryTags();
  const preferred = useMemo(() => profile?.preferredTagIds ?? [], [profile?.preferredTagIds]);
  const rows = useMemo(() => {
    if (!tags) return [];
    const usable = tags.filter(t => !t.isErotic);
    const mine = preferred.map(id => usable.find(t => t.id === id)).filter(Boolean) as typeof usable;
    const rest = usable.filter(t => !preferred.includes(t.id));
    return [...mine, ...rest].slice(0, section.limit ?? 3);
  }, [tags, preferred, section.limit]);
  return (
    <>
      {rows.map((tag, i) => <TagRow key={tag.id} tag={tag} index={index + i} />)}
    </>
  );
};

const NewStoriesSection = ({ section, index }: Props) => {
  const { data } = useStories(section.limit ?? 12);
  return <StoryRow title={section.title || 'New'} stories={data ?? []} index={index} />;
};

const HandPickedSection = ({ section, index }: Props) => {
  const ids = useMemo(() => (section.storyIds ?? []).filter(Boolean) as string[], [section.storyIds]);
  const { stories } = useStoriesByIds(ids);
  return <StoryRow title={section.title || 'Hand-picked'} stories={stories} index={index} />;
};

const FeaturedAuthorSection = ({ section, index }: Props) => {
  const navigation = useNavigation<any>();
  const typo = useTypography();
  const { data: author } = useAuthor(section.authorId ?? '');
  const { data: photo } = useAuthorImage(author?.profilePicUri);
  const { data } = useAuthorNewest(section.authorId, section.limit ?? 10);
  const { stories } = useEnrichedStories(data);
  if (!author || stories.length === 0) return null;
  const blurb = section.blurb || author.bio || '';
  return (
    <Reveal index={index}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AuthorDetails', { id: author.id })}
        style={styles.authorHeader}
        accessibilityRole="button"
        accessibilityLabel={`${section.title || 'Featured author'}: ${author.name}`}
        accessibilityHint="Opens the author page"
      >
        {photo ? (
          <CachedImage source={{ uri: photo }} style={styles.authorPhoto} />
        ) : (
          <CachedImage source={require('../../../assets/images/blankprofile.png')} style={styles.authorPhoto} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.authorLabel}>{section.title || 'Featured author'}</Text>
          <Text style={typo.title} numberOfLines={1}>{author.name}</Text>
          {blurb ? <Text style={styles.authorBlurb} numberOfLines={2}>{blurb}</Text> : null}
        </View>
      </TouchableOpacity>
      <HorizontalList stories={stories} showSeeMore={false} />
    </Reveal>
  );
};

const HomeSectionView = ({ section, index }: Props) => {
  useEffect(() => {
    Analytics.homeSectionShown({ sectionId: section.id, type: section.type, position: index });
  }, [section.id]);

  const reveal = Math.min(index + 1, 6);
  switch (section.type) {
    case 'forYou':            return <ForYouSection section={section} index={reveal} />;
    case 'continueListening': return (
      <Reveal index={reveal} style={{ paddingVertical: 10 }}>
        <ContinueListening />
      </Reveal>
    );
    case 'becauseYou':        return <Reveal index={reveal}><BecauseYouFinished /></Reveal>;
    case 'genres':            return <GenresSection section={section} index={reveal} />;
    case 'newStories':        return <NewStoriesSection section={section} index={reveal} />;
    case 'featuredAuthor':    return <FeaturedAuthorSection section={section} index={reveal} />;
    case 'handPicked':        return <HandPickedSection section={section} index={reveal} />;
    default:                  return null;
  }
};

export default HomeSectionView;

const styles = StyleSheet.create({
  titleWrap: { marginLeft: spacing.margin, paddingVertical: spacing.margin },
  authorHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.margin, paddingVertical: spacing.margin, gap: 12,
  },
  authorPhoto: { width: 56, height: 56, borderRadius: 28 },
  authorLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.6 },
  authorBlurb: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
