import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';
import { useIsGuest } from '@/lib/dataAccess';
import { askForAccount } from '@/lib/requireAccount';
import { useIsFollowingTag, useFollowTag, useUnfollowTag } from '@/hooks/queries/useTagFollowing';

type Props = {
  tagId: string;
  tagName: string;
  /** 'bubble' sits on a hero image (dark translucent); 'outline' sits on a plain header. */
  variant?: 'bubble' | 'outline';
};

// Follow or unfollow a genre. Guests are asked to create an account first and the follow is done for them afterwards.
const FollowTagButton = ({ tagId, tagName, variant = 'outline' }: Props) => {
  const guest = useIsGuest();
  const { data } = useIsFollowingTag(tagId);
  const follow = useFollowTag();
  const unfollow = useUnfollowTag();

  const isFollowing = data?.isFollowing ?? false;
  const recordId = data?.recordId ?? null;

  const onPress = () => {
    if (guest) { askForAccount('follow genres', { kind: 'followTag', id: tagId, name: tagName }); return; }
    if (isFollowing && recordId) unfollow.mutate({ recordId, tagId, name: tagName });
    else if (!isFollowing) follow.mutate({ tagId, name: tagName });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.base, variant === 'bubble' ? styles.bubble : styles.outline, isFollowing && styles.active]}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? `Following ${tagName}` : `Follow ${tagName}`}
      accessibilityHint={isFollowing ? 'Double tap to unfollow' : undefined}
      accessibilityState={{ selected: isFollowing }}
    >
      <Text style={[styles.text, isFollowing && styles.textActive]}>{isFollowing ? 'Following' : 'Follow'}</Text>
    </TouchableOpacity>
  );
};

export default FollowTagButton;

const styles = StyleSheet.create({
  base:    { borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: colors.accent },
  bubble:  { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: colors.accent },
  active:  { backgroundColor: colors.accent, borderColor: colors.accent },
  text:    { color: colors.accent, fontWeight: '700', fontSize: fontSizes.small },
  textActive: { color: colors.textOnAccent },
});
