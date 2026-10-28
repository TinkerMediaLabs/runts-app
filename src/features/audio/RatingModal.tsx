import React, { useState, useEffect } from 'react';
import { isCommentAllowed, COMMENT_REJECTED_MESSAGE } from '../../lib/commentFilter';
import { successHaptic } from '../../lib/haptics';
import { useRef } from 'react';
import { View, Alert, AccessibilityInfo, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { useQueryClient } from '@tanstack/react-query';

import { usePlayerUI } from '@/context/PlayerUIContext';
import { useApp } from '@/context/AppContext';

import { Analytics } from '@/lib/analytics';
import { unwrap } from '@/lib/amplifyResult';

import { CachedImage } from '../../components/common/CachedImage';
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

  const { profile } = useApp();

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
      await run('comment', () => client.models.Comment.create({
          userId,
          storyId,
          content: comment.trim(),
          userName: postAnonymously ? 'Anonymous' : (profile?.name ?? 'Anonymous'),
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
                  <FontAwesome
                    name={selectedRating !== null && star <= selectedRating ? 'star' : 'star-o'}
                    size={24}
                    color="#C9A84C"
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
              placeholderTextColor="rgba(255,255,255,0.55)"
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
                    <FontAwesome5 name="check" size={9} color="#000" iconStyle="solid" />
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
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              activeOpacity={0.8}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit"
              accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
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
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    borderBottomColor: '#2a2a2a',
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  finishedLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2a2a',
    marginVertical: 20,
  },

  // ── Stars ─────────────────────────────────────────────────────────────────
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
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
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
  },
  emojiBtnSelected: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderColor: 'rgba(0,255,255,0.6)',
  },
  emoji: {
    fontSize: 24,
  },
  emojiLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    textAlign: 'center',
  },
  emojiLabelSelected: {
    color: 'cyan',
  },

  // ── Comment ───────────────────────────────────────────────────────────────
  commentBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
  },
  commentInput: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
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
    borderTopColor: '#2a2a2a',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: 'cyan',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
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
  borderColor: 'rgba(255,255,255,0.25)',
  alignItems: 'center',
  justifyContent: 'center',
},
anonCheckboxActive: {
  backgroundColor: 'cyan',
  borderColor: 'cyan',
},
anonLabel: {
  fontSize: 13,
  color: 'rgba(255,255,255,0.55)',
},
});