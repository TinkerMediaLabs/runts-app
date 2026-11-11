import React, { useEffect } from 'react';
import { Pressable, View, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing, cancelAnimation,
} from 'react-native-reanimated';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { Text } from '@/components/common/AppText';
import { usePlayer } from '@/context/PlayerContext';
import { usePreviewStatus, togglePreview, stopPreview, previewAvailable, PREVIEW_SECONDS } from '@/features/audio/preview';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { showChip } from '@/lib/chip';
import { colors } from '@/theme/colors';
import { fontSizes, iconSize, radius } from '@/theme/tokens';

// Four bars that bounce while the preview plays (the "it is playing" signal). Still when Reduce Motion is on.
function Bar({ index, active, color }: { index: number; active: boolean; color: string }) {
  const h = useSharedValue(0.35);
  const reduce = useReduceMotion();
  useEffect(() => {
    cancelAnimation(h);
    if (!active || reduce) { h.value = active ? 0.7 : 0.35; return; }
    h.value = withDelay(index * 120, withRepeat(withTiming(1, { duration: 420 + index * 90, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(h);
  }, [active, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ height: 3 + h.value * 11 }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

// "Preview" button for the story details screen. Plays a short clip right here (no track player). Tap again to
// stop. If a story is playing in the main player it is paused first. Renders nothing in a build without expo-audio.
export default function PreviewButton({ story, isErotic = false }: { story: any; isErotic?: boolean }) {
  const { state, pause } = usePlayer();
  const status = usePreviewStatus(story?.id);
  const accent = isErotic ? '#ff7c2a' : colors.accent;                 // for the faint fill
  const soft   = isErotic ? '#ff7c2aa5' : colors.accentSoft;            // slightly see-through, for line, icon and text

  // Leaving the screen ends the preview.
  useEffect(() => () => { if (story?.id) stopPreview(); }, [story?.id]);

  if (!story?.audioUri || !previewAvailable()) return null;

  const onPress = async () => {
    if (status === 'idle' && state?.isPlaying) await pause();   // the story in the main player pauses; it is not resumed after
    try {
      await togglePreview(story);
    } catch {
      showChip("Preview isn't available right now", 'error');
    }
  };

  const playing = status === 'playing';
  const label = status === 'loading' ? 'Loading preview' : playing ? 'Playing preview' : 'Preview';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, { borderColor: soft }, playing && { backgroundColor: accent + '22' }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Stop preview' : `Play a ${PREVIEW_SECONDS} second preview`}
      accessibilityState={{ busy: status === 'loading' }}
    >
      <View style={styles.iconBox}>
        {status === 'loading' ? (
          <ActivityIndicator size="small" color={soft} />
        ) : playing ? (
          <View style={styles.bars}>{[0, 1, 2, 3].map(i => <Bar key={i} index={i} active color={soft} />)}</View>
        ) : (
          <FontAwesome5 name="play" size={iconSize.xs} color={soft} iconStyle="solid" />
        )}
      </View>
      <Text style={[styles.label, { color: soft }]}>{label}</Text>
      {!playing && status === 'idle' ? <Text style={styles.length}>{PREVIEW_SECONDS}s</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.pill ?? 999,
    paddingVertical: 5,
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  iconBox: { width: 18, height: 16, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 16 },
  bar: { width: 2.5, borderRadius: 2 },
  label: { fontSize: fontSizes.small, fontWeight: '700' },
  length: { fontSize: fontSizes.caption, color: colors.textSecondary },
});
