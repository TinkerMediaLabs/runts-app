import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';

type Props = {
  name: string;
  onPress: () => void;
  kind?: 'tag' | 'mood';     // tag: outline only. mood: the soft purple pill used for mood and tone.
  erotic?: boolean;
  style?: any;
};

// The app's one tag pill (no # sign): story details, Discover, popular tags, the player's tag list.
export default function TagPill({ name, onPress, kind = 'tag', erotic = false, style }: Props) {
  const tone = erotic ? styles.erotic : kind === 'mood' ? styles.mood : styles.tag;
  const text = erotic ? styles.eroticText : kind === 'mood' ? styles.moodText : styles.tagText;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.pill, tone, style]}
      accessibilityRole="button"
      accessibilityLabel={`${kind === 'mood' ? 'Mood' : 'Tag'} ${name}`}
      accessibilityHint="Opens stories with this tag"
    >
      <Text style={[styles.text, text]} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.xl, borderWidth: 1, justifyContent: 'center', minHeight: 36 },
  text: { fontSize: fontSizes.small, fontWeight: '500' },
  tag: { borderColor: colors.accentSoft, backgroundColor: 'transparent' },
  tagText: { color: colors.accentSoft },
  mood: { borderColor: colors.moodBorder, backgroundColor: 'transparent' },
  moodText: { color: colors.moodBorder },
  erotic: { borderColor: 'rgba(255,124,42,0.6)', backgroundColor: 'transparent' },
  eroticText: { color: 'rgba(255,124,42,0.6)' },
});
