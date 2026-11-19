import React from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/AppText';
import Icon from '@/components/common/Icon';
import { useOpenStory } from '@/hooks/useStorySource';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useStoryTagIds } from '../../hooks/queries/useStoryTagIds';
import { useTagNames } from '../../hooks/queries/useTagNames';
import { getDurationDisplay, getSpiceDisplay } from '../../lib/storyDisplay';
import { CachedImageBackground } from '../common/CachedImage';
import LoadingItem from '../common/LoadingItem';
import PremiumBadge from '../common/PremiumBadge';
import { spacing } from '../../theme/spacing';
import { pickCardHeight } from '../../lib/pickOfDay';
import { colors } from '@/theme/colors';
import { fontSizes, layout, radius } from '@/theme/tokens';

// "Pick of the Day": one story on a card as wide as the screen with the same shape as a row tile, with room for a short
// summary. It sits under a normal section title. Meant to break up the rows on For You.

const PickOfDayCard = ({ story }: { story: any }) => {
  const openStory = useOpenStory();
  const { width } = useWindowDimensions();
  const cardW = width - spacing.margin * 2;
  const cardH = pickCardHeight(cardW, layout.tileWidth, layout.tileHeight);   // the tile's shape, scaled to the card's width

  const { data: resolved } = useStoryImage(story.imageUri?.startsWith('stories/') ? story.imageUri : null);
  const img = resolved ?? story.imageUri;
  const duration = getDurationDisplay(story.duration, story.progressStatus ?? 'none', story.progressSeconds ?? 0);
  const spice = getSpiceDisplay(story.spiceRating);
  const summary: string = (story.summary ?? '').trim();

  // The rest of the story's tags, after the primary and secondary ones, in the same pills with a dot between.
  const { data: tagIds } = useStoryTagIds(story.id);
  const restIds = (tagIds ?? []).filter(id => id !== story.primaryTagId && id !== story.secondaryTagId);
  const { data: restNames } = useTagNames(restIds);
  const rest = restIds.map(id => ({ id, name: restNames[id] })).filter(t => !!t.name).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openStory(story.id)}
      style={[styles.wrap, { width: cardW, height: cardH }]}
      accessibilityRole="button"
      accessibilityLabel={['Pick of the day', story.title, story.authorName ? `by ${story.authorName}` : null, duration.text].filter(Boolean).join(', ')}
      accessibilityHint="Opens the story"
    >
      {img ? (
        <CachedImageBackground source={{ uri: img }} style={[styles.card, { height: cardH }]} imageStyle={styles.image}>
          {story.isPremium === true && <PremiumBadge />}

          {story.duration > 0 && (
            <View style={styles.durationPill} pointerEvents="none">
              <Icon name={duration.icon} size={11} color={duration.color} />
              <Text style={[styles.durationText, { color: duration.color }]}>{duration.text}</Text>
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.97)']}
            locations={[0.15, 0.4, 0.72, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
            {story.authorName ? (
              <View style={styles.authorRow}>
                <Icon name="book-open" weight="fill" size={12} color={colors.textSecondary} />
                <Text style={styles.author} numberOfLines={1}>{story.authorName}</Text>
              </View>
            ) : null}
            {summary ? <Text style={styles.summary} numberOfLines={3}>{summary}</Text> : null}
            {(story.primaryTagName || story.secondaryTagName || spice || rest.length > 0) ? (
              <View style={styles.tagRow}>
                {spice ? <Text style={styles.tagText}>{spice}</Text> : null}
                {story.primaryTagName ? <View style={styles.tag}><Text style={styles.tagText}>{story.primaryTagName}</Text></View> : null}
                {story.secondaryTagName ? <View style={styles.tag}><Text style={styles.tagText}>{story.secondaryTagName}</Text></View> : null}
                {rest.length > 0 && (story.primaryTagName || story.secondaryTagName) ? <View style={styles.tagDot} /> : null}
                {rest.map(t => (
                  <View key={t.id} style={styles.tag}><Text style={styles.tagText}>{t.name}</Text></View>
                ))}
              </View>
            ) : null}
          </View>
        </CachedImageBackground>
      ) : (
        <LoadingItem height={cardH} width={cardW} radius={radius.lg} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  card: { width: '100%', borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.surface2, borderWidth: 0.5, borderColor: colors.borderSubtle },
  image: { borderRadius: radius.lg },
  durationPill: {
    position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: radius.xl, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle,
  },
  durationText: { fontSize: fontSizes.caption, fontWeight: '600', letterSpacing: 0.2 },
  info: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  title: { fontSize: fontSizes.headline, fontWeight: '700', color: colors.textPrimary, lineHeight: 28 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  author: { fontSize: fontSizes.small, color: colors.textSecondary, flexShrink: 1 },
  summary: { fontSize: fontSizes.small, color: colors.textStrong, lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.fill, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tagDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textTertiary, alignSelf: 'center' },   // sets the extra tags apart
  tagText: { fontSize: fontSizes.caption, fontWeight: '600', color: colors.textStrong, textTransform: 'capitalize' },
});

export default PickOfDayCard;
