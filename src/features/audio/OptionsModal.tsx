import React, { useEffect } from 'react';
import { View, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';

import Feather from '@react-native-vector-icons/feather';
import { useTipTarget } from '../../tips/useTipTarget';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
const MODAL_WIDTH  = SCREEN_WIDTH * 0.82;

// Must match heroHeader paddingHorizontal and headerbutton size in TrackPlayer
export const OPTIONS_BUTTON_SIZE  = 40;
const BUTTON_RIGHT     = 20; // heroHeader paddingHorizontal
const BUTTON_EXTRA_TOP = 12; // extra offset below insets.top in heroHeader

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OptionsModalProps {
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  insetsTop: number;
  playbackRate: number;
  onDismiss: () => void;
  sleepMinutesLeft: number | null;
  sleepEndOfStory?: boolean;
  isPinned: boolean;
  onInfo: () => void;
  onTogglePin: () => void;
  onSpeed: () => void;
  onSleep: () => void;
  onShare: () => void;
  onBookmark: () => void;
}

const MenuRow = ({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) => (
  <TouchableOpacity
    style={styles.menuRow}
    activeOpacity={0.6}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={value ? `${label}, ${value}` : label}
  >
    <Text style={styles.menuText}>{label}</Text>
    {value ? <Text style={styles.menuValue}>{value}</Text> : null}
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OptionsModal({
  visible,
  onOpen,
  onClose,
  insetsTop,
  playbackRate,
  onDismiss,
  sleepMinutesLeft,
  sleepEndOfStory = false,
  isPinned,
  onInfo,
  onTogglePin,
  onSpeed,
  onSleep,
  onShare,
  onBookmark,
}: OptionsModalProps) {

  const tipRef = useTipTarget('player-options');
  const progress = useSharedValue(0); // 0 = closed, 1 = open
  const [isMounted, setIsMounted] = React.useState(false);

  // The button and the card share the same top-right origin point
  const buttonTop = insetsTop + BUTTON_EXTRA_TOP;
  const cardTop   = buttonTop;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(0, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      });
    }
  }, [visible]);

  // ---------------------------------------------------------------------------
  // Animated styles
  // ---------------------------------------------------------------------------

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.6,
  }));

  const cardStyle = useAnimatedStyle(() => {
    const scale = progress.value;
    const tx = (MODAL_WIDTH / 2) * (1 - scale);
    return {
      opacity: interpolate(progress.value, [0, 0.15], [0, 1]),
      transformOrigin: 'top right',
      transform: [
        { translateX: tx },
        { scaleX: scale },
        { scaleY: scale },
      ],
    };
  });

  const menuIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));

  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 0.8], [0, 1]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [-45, 0])}deg` }],
    position: 'absolute',
  }));

  const sleepValue = sleepEndOfStory ? 'End of story' : sleepMinutesLeft !== null ? `${sleepMinutesLeft} min left` : 'Off';
  const run = (fn: () => void) => () => { onClose(); fn(); };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

      {/* Backdrop — behind card and button, closes on tap */}
      {isMounted && (
        <TouchableWithoutFeedback
            accessibilityRole="none"
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
      )}

      {/* Card — expands from the button's top-right corner */}
      {isMounted && (
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            { top: cardTop, right: BUTTON_RIGHT, width: MODAL_WIDTH },
            cardStyle,
          ]}
        >
          <MenuRow label="Story details" onPress={run(onInfo)} />
          <MenuRow label={isPinned ? 'Unpin story' : 'Pin story'} onPress={run(onTogglePin)} />
          <MenuRow label="Playback speed" value={`${playbackRate}x`} onPress={run(onSpeed)} />
          <MenuRow label="Sleep timer" value={sleepValue} onPress={run(onSleep)} />
          <MenuRow label="Share story" onPress={run(onShare)} />
          <MenuRow label="Add bookmark" onPress={run(onBookmark)} />

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.dismissRow}
            activeOpacity={0.6}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Feather name="x-circle" size={16} color="#ff6b6b" />
            <Text style={styles.dismissText}>Close Player</Text>
          </TouchableOpacity>

        </Animated.View>
      )}

      {/* Button — always on top, overlays the card's top-right corner.
          Shows more-vertical when closed, X when open. */}
      <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        ref={tipRef as any}
        style={[styles.button, { top: buttonTop, right: BUTTON_RIGHT }]}
        onPress={visible ? onClose : onOpen}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Close player options' : 'Player options'}
        accessibilityHint={visible ? undefined : 'Story actions, playback speed, sleep timer and close player'}
        accessibilityState={{ expanded: visible }}
      >
        <Animated.View style={menuIconStyle}>
          <Feather name="more-vertical" size={24} color={colors.textPrimary} />
        </Animated.View>
        <Animated.View style={closeIconStyle}>
          <Feather name="x" size={22} color={colors.textPrimary} />
        </Animated.View>
      </TouchableOpacity>

    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

  backdrop: {
    backgroundColor: colors.surface0,
  },

  button: {
    position: 'absolute',
    width: OPTIONS_BUTTON_SIZE,
    height: OPTIONS_BUTTON_SIZE,
    borderRadius: OPTIONS_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    position: 'absolute',
    backgroundColor: colors.surface0,
    borderRadius: 16,
    paddingTop: OPTIONS_BUTTON_SIZE + 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.fillFaint,
    marginVertical: 14,
  },

  menuRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuText: { color: colors.textStrong, fontSize: fontSizes.body },
  menuValue: { color: colors.textSecondary, fontSize: fontSizes.small },

  dismissRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dismissText: {
    color: colors.danger,
    fontSize: fontSizes.small,
    fontWeight: '600',
  },

});