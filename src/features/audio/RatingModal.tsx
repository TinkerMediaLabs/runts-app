import React, { useState, useEffect } from 'react';
import { isCommentAllowed, COMMENT_REJECTED_MESSAGE } from '../../lib/commentFilter';
import { successHaptic } from '../../lib/haptics';
import { useRef } from 'react';
import { View, Alert, AccessibilityInfo, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';
import Button from '@/components/common/Button';
import { TextInput } from '@/components/common/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { useQueryClient } from '@tanstack/react-query';

import { usePlayerUI } from '@/context/PlayerUIContext';

import { Analytics } from '@/lib/analytics';
import { unwrap } from '@/lib/amplifyResult';

import { CachedImage } from '../../components/common/CachedImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
const client = generateClient<Schema>();
const { width } = Dimensions.get('window');



// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

const REACTIONS = [
  { key: 'shocked',      emoji: '😱', label: 'Shocked'      },
  { key: 'frustrated',   emoji: '😤', label: 'Frustrated'   },
  { key: 'sad',          emoji: '😢', label: 'Sad'          },
  { key: 'reflective',   emoji: '🤔', label: 'Reflective'   },
  { key: 'touched',      emoji: '🥹', label: 'Touched'      },
  { key: 'amused',       emoji: '😂', label: 'Amused'       },
  { key: 'scared',       emoji: '😨', label: 'Scared'       },
  { key: 'bored',        emoji: '😴', label: 'Bored'        },
  { key: 'uninterested', emoji: '😑', label: 'Uninterested' },
  { key: 'thrilled',     emoji: '🤩', label: 'Thrilled'     },
  { key: 'confused',     emoji: '😕', label: 'Confused'     },
  { key: 'tense',        emoji: '😰', label: 'Tense'        },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RatingModalProps {
  visible: boolean;
  storyId: string;
  storyTitle: string;
  artwork?: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RatingModal({
  visible,
  storyId,
  storyTitle,
  artwork,
  onClose,
}: RatingModalProps) {
  const queryClient = useQueryClient();

  const insets = useSafeAreaInsets();
  const footerBottomPadding = insets.bottom + 16;


  const [selectedRating,   setSelectedRating]   = useState<number | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [comment,          setComment]           = useState('');
  const [isSubmitting,     setIsSubmitting]      = useState(false);
  const [existingRatingId,   setExistingRatingId]   = useState<string | null>(null);
  const [existingReactionId, setExistingReactionId] = useState<string | null>(null);
  const [postAnonymously, setPostAnonymously] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  // ── Animations ─────────────────────────────────────────────────────────────
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(80);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle    = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      opacity.value    = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
      translateY.value = withSpring(0, { damping: 26, stiffness: 180 });
      loadExisting();
    } else {
      opacity.value    = withTiming(0, { duration: 180 });
      translateY.value = withTiming(80, { duration: 180 });
      // Reset on close so it's fresh next time
      setSelectedRating(null);
      setSelectedReaction(null);
      setComment('');
      setExistingRatingId(null);
      setExistingReactionId(null);
      setPostAnonymously(false);
    }
  }, [visible]);

  // ── Load existing rating/reaction (for re-rating from story detail) ────────
  const loadExisting = async () => {
    try {
      const { userId } = await getCurrentUser();

      const { data: ratings } = await (client.models.UserRating as any).listUserRatingByUserIdAndStoryId(
        { userId, storyId: { eq: storyId } }, { limit: 1 });
      if (ratings?.length) {
        setExistingRatingId(ratings[0].id);
        setSelectedRating(ratings[0].rating);
      }

      const { data: reactions } = await (client.models.UserReaction as any).listUserReactionByUserIdAndStoryId(
        { userId, storyId: { eq: storyId } }, { limit: 1 });
      if (reactions?.length) {
        setExistingReactionId(reactions[0].id);
        setSelectedReaction(reactions[0].reaction ?? null);
      }
    } catch (err) {
      console.error('RatingModal loadExisting error:', err);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (selectedRating === null && selectedReaction === null && !comment.trim()) {
    onClose();
    return;
  }

  if (comment.trim() && !isCommentAllowed(comment)) {
    Alert.alert('Comment not allowed', COMMENT_REJECTED_MESSAGE);
    return;
  }

  setIsSubmitting(true);
  try {
    const { userId } = await getCurrentUser();
    // Each save is attempted on its own. Whatever saved is remembered (so retrying the rest never
    // creates a duplicate rating, reaction or comment); anything rejected is reported to the user.
    const failures: string[] = [];
    const run = async (label: string, op: () => Promise<any>, onSaved?: (row: any) => void) => {
      try {
        onSaved?.(unwrap(await op(), label));
      } catch (err) {
        console.warn('RatingModal save failed:', err);
        failures.push(label);
      }
    };

    // Rating — upsert
    if (selectedRating !== null) {
      await run('rating', () => existingRatingId
        ? client.models.UserRating.update({ id: existingRatingId, rating: selectedRating })
        : client.models.UserRating.create({ userId, storyId, rating: selectedRating }),
        (row) => { if (row?.id) setExistingRatingId(row.id); });
    }

    // Reaction — upsert
    if (selectedReaction !== null) {
      await run('reaction', () => existingReactionId
        ? client.models.UserReaction.update({ id: existingReactionId, reaction: selectedReaction })
        : client.models.UserReaction.create({ userId, storyId, reaction: selectedReaction }),
        (row) => { if (row?.id) setExistingReactionId(row.id); });
    }

    // Comment — always new
    if (comment.trim()) {
      await run('comment', () => client.mutations.postComment({
          storyId,
          content: comment.trim(),
          anonymous: postAnonymously,
        }),
        () => setComment(''));
    }

    if (failures.length > 0) {
      Alert.alert(
        'Not everything was saved',
        `Your ${failures.join(' and ')} could not be saved. Please try again.`,
      );
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      return;
    }

    // Track analytics events
    if (selectedRating !== null) {
        Analytics.storyRated({ storyId, title: storyTitle, rating: selectedRating });
    }
    if (selectedReaction !== null) {
        Analytics.storyReacted({ storyId, title: storyTitle, reaction: selectedReaction });
    }
    if (comment.trim()) {
        Analytics.storyCommented({ storyId, title: storyTitle });
    }

    queryClient.invalidateQueries({ queryKey: ['story', storyId] });
    queryClient.invalidateQueries({ queryKey: ['stories'] });
    queryClient.invalidateQueries({ queryKey: ['favoritedStories'] });

    successHaptic();
    onClose();
  } catch (err) {
    console.error('RatingModal submit error:', err);
  } finally {
    setIsSubmitting(false);
  }
};

  // This popup is an overlay (not a native modal), so tell screen readers it appeared.
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`You finished ${storyTitle}. Rate this story.`);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.overlay, overlayStyle]}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.card, cardStyle]} accessibilityViewIsModal>

          {/* ── Story header ── */}
          <View style={styles.storyHeader}>
            {artwork ? (
              <CachedImage source={{ uri: artwork }} style={styles.artwork} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.finishedLabel}>You finished</Text>
              <Text style={styles.storyTitle} numberOfLines={2}>{storyTitle}</Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Rating ── */}
            <Text style={styles.sectionLabel}>Rate this story</Text>
            <View style={styles.starsRow} accessibilityRole="radiogroup">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(star => (
                <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  key={star}
                  onPress={() => setSelectedRating(selectedRating === star ? null : star)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                  accessibilityRole="radio"
                  accessibilityLabel={`${star} out of 10`}
                  accessibilityState={{ checked: selectedRating === star }}
                >
                  <FontAwesome5
                    name="star"
                    iconStyle={selectedRating !== null && star <= selectedRating ? 'solid' : 'regular'}
                    size={iconSize.md}
                    color={colors.gold}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingHint}>
              {selectedRating !== null ? `${selectedRating} / 10` : 'Tap a star to rate'}
            </Text>

            <View style={styles.divider} />

            {/* ── Reaction ── */}
            <Text style={styles.sectionLabel}>How did you feel?</Text>
            <View style={styles.emojiGrid}>
              {REACTIONS.map(r => {
                const isSelected = selectedReaction === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setSelectedReaction(isSelected ? null : r.key)}
                    activeOpacity={0.7}
                    style={[styles.emojiBtn, isSelected && styles.emojiBtnSelected]}
                    accessibilityRole="radio"
                    accessibilityLabel={r.label}
                    accessibilityState={{ checked: isSelected }}
                  >
                    <Text style={styles.emoji}>{r.emoji}</Text>
                    <Text style={[styles.emojiLabel, isSelected && styles.emojiLabelSelected]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* ── Comment ── */}
            <Text style={styles.sectionLabel}>Leave a comment</Text>
            <View style={styles.commentBox}>
             <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Share your thoughts… (optional)"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Comment, optional"
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 300); // delay lets the keyboard finish animating up first
              }}
            />
              <Text style={styles.charCount}>{comment.length} / 500</Text>
              <TouchableOpacity
                onPress={() => setPostAnonymously(v => !v)}
                activeOpacity={0.7}
                style={styles.anonRow}
                accessibilityRole="checkbox"
                accessibilityLabel="Post anonymously"
                accessibilityState={{ checked: postAnonymously }}
              >
                <View style={[styles.anonCheckbox, postAnonymously && styles.anonCheckboxActive]}>
                  {postAnonymously && (
                    <FontAwesome5 name="check" size={9} color={colors.textOnAccent} iconStyle="solid" />
                  )}
                </View>
                <Text style={styles.anonLabel}>Post anonymously</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 240 }} />

          </ScrollView>

          {/* ── Footer ── */}
          <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.skipBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Skip rating"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <Button
              label="Submit"
              loading={isSubmitting}
              onPress={handleSubmit}
              style={{ minWidth: 140 }}
            />
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const EMOJI_BTN_SIZE = (width - 48 - 33) / 4; // 4 columns, 48px padding, 3 gaps of 11

const styles = StyleSheet.create({

  overlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },

  card: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // ── Story header ──────────────────────────────────────────────────────────
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  finishedLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  storyTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  sectionLabel: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface3,
    marginVertical: 20,
  },

  // ── Stars ─────────────────────────────────────────────────────────────────
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starBtn: {
    padding: 2,
    flexShrink: 1,
  },
  ratingHint: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Emoji grid ────────────────────────────────────────────────────────────
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  emojiBtn: {
    width: EMOJI_BTN_SIZE,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  emojiBtnSelected: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderColor: 'rgba(0,255,255,0.6)',
  },
  emoji: {
    fontSize: fontSizes.headline,
  },
  emojiLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  emojiLabelSelected: {
    color: colors.accent,
  },

  // ── Comment ───────────────────────────────────────────────────────────────
  commentBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  commentInput: {
    color: colors.textPrimary,
    fontSize: fontSizes.small,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  anonRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 10,
},
anonCheckbox: {
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 1.5,
  borderColor: colors.border,
  alignItems: 'center',
  justifyContent: 'center',
},
anonCheckboxActive: {
  backgroundColor: colors.accent,
  borderColor: colors.accent,
},
anonLabel: {
  fontSize: fontSizes.small,
  color: colors.textSecondary,
},
});