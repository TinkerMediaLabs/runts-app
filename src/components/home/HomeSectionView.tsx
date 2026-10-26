import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
import { useTasteProfile } from '../../hooks/queries/useTasteProfile';
import { useTrendingSection } from '../../hooks/queries/useTrending';
import { useAuthorNewest } from '../../hooks/queries/useAuthorNewest';
import { useAuthor } from '../../hooks/queries/useAuthors';
import { useAuthorImage } from '../../hooks/queries/useAuthorImage';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import { Analytics } from '../../lib/analytics';
import type { HomeSectionRow } from '../../lib/homeLayout';
import useTypography from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Props = { section: HomeSectionRow; index: number };

// Sections load their data independently. Each one tells the Home screen when it has settled (data in, or
// confirmed empty) so the screen can show them strictly top to bottom and nothing jumps down later.
const SettleContext = createContext<() => void>(() => {});
const useSettleWhen = (ready: boolean) => {
  const settle = useContext(SettleContext);
  useEffect(() => { if (ready) settle(); }, [ready, settle]);
};
const useSettleAfter = (ms: number) => {
  const settle = useContext(SettleContext);
  useEffect(() => { const t = setTimeout(settle, ms); return () => clearTimeout(t); }, [ms, settle]);
};

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
  // Wait for the listening profile so the carousel does not rebuild itself a moment after it appears; if it
  // cannot be read (offline), carry on with the picked genres alone.
  const { data: tasteData, isLoading: tasteLoading } = useTasteProfile(preferred);
  const { data, isPending } = useForYouStories(preferred, section.limit ?? 8, {
    learnedTagIds: tasteData?.learnedTagIds ?? [],
    listenedIds: tasteData?.listenedIds ?? [],
    ready: !tasteLoading,
  });
  const { stories, tagMap } = useEnrichedStories(data);
  useSettleWhen(!isPending);
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
  useSettleAfter(1200);
  return (
    <>
      {rows.map((tag, i) => <TagRow key={tag.id} tag={tag} index={index + i} />)}
    </>
  );
};

const NewStoriesSection = ({ section, index }: Props) => {
  const { data, isLoading } = useStories(section.limit ?? 12);
  useSettleWhen(!isLoading);
  return <StoryRow title={section.title || 'New'} stories={data ?? []} index={index} />;
};

export const HandPickedSection = ({ section, index }: Props) => {
  const ids = useMemo(() => (section.storyIds ?? []).filter(Boolean) as string[], [section.storyIds]);
  const { stories } = useStoriesByIds(ids);
  useSettleAfter(1200);
  return <StoryRow title={section.title || 'Hand-picked'} stories={stories} index={index} />;
};

const TrendingSection = ({ section, index }: Props) => {
  const { data, isLoading } = useTrendingSection(section.windowDays, section.limit ?? 10);
  useSettleWhen(!isLoading);
  return <StoryRow title={section.title || 'Trending'} stories={data ?? []} index={index} />;
};

export const FeaturedAuthorSection = ({ section, index }: Props) => {
  const navigation = useNavigation<any>();
  const typo = useTypography();
  const { data: author } = useAuthor(section.authorId ?? '');
  const { data: photo } = useAuthorImage(author?.profilePicUri);
  const { data, isLoading } = useAuthorNewest(section.authorId, section.limit ?? 10);
  const { stories } = useEnrichedStories(data);
  useSettleWhen(!isLoading && !!author);
  useSettleAfter(2500);
  if (!author || stories.length === 0) return null;
  const blurb = section.blurb || author.bio || '';
  return (
    <Reveal index={index} style={styles.authorBlock}>
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

const SectionContent = ({ section, index }: Props) => {
  const reveal = Math.min(index + 1, 6);
  switch (section.type) {
    case 'forYou':            return <ForYouSection section={section} index={reveal} />;
    case 'continueListening': return (
      <TimedReveal index={reveal} style={{ paddingVertical: 10 }}>
        <ContinueListening />
      </TimedReveal>
    );
    case 'becauseYou':        return <TimedReveal index={reveal}><BecauseYouFinished /></TimedReveal>;
    case 'genres':            return <GenresSection section={section} index={reveal} />;
    case 'newStories':        return <NewStoriesSection section={section} index={reveal} />;
    case 'featuredAuthor':    return <FeaturedAuthorSection section={section} index={reveal} />;
    case 'handPicked':        return <HandPickedSection section={section} index={reveal} />;
    case 'trending':          return <TrendingSection section={section} index={reveal} />;
    default:                  return null;
  }
};


const TimedReveal = ({ index, style, children }: { index: number; style?: any; children: React.ReactNode }) => {
  useSettleAfter(1200);
  return <Reveal index={index} style={style}>{children}</Reveal>;
};

// Sections mount right away so their data loads in parallel, but stay invisible and out of the layout until
// every section above them has settled.
const HomeSectionView = ({ section, index, visible, onSettled }: Props & { visible: boolean; onSettled: (id: string) => void }) => {
  const settle = useCallback(() => onSettled(section.id), [onSettled, section.id]);
  const shown = useRef(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(settle, 3000);
    return () => clearTimeout(t);
  }, [settle]);

  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      opacity.value = withTiming(1, { duration: 250 });
      Analytics.homeSectionShown({ sectionId: section.id, type: section.type, position: index });
    }
  }, [visible]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <SettleContext.Provider value={settle}>
      <Animated.View
        style={[visible ? undefined : styles.hidden, fade]}
        pointerEvents={visible ? 'auto' : 'none'}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      >
        <SectionContent section={section} index={index} />
      </Animated.View>
    </SettleContext.Provider>
  );
};

export default HomeSectionView;

const styles = StyleSheet.create({
  hidden: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  titleWrap: { marginLeft: spacing.margin, paddingVertical: spacing.margin },
  authorHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.margin, paddingTop: 8, paddingBottom: 20, gap: 14,
  },
  authorBlock: {
    marginTop: 28, marginBottom: 20, paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)',
  },
  authorPhoto: { width: 64, height: 64, borderRadius: 32 },
  authorLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.6 },
  authorBlurb: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
