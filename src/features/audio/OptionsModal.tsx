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

import Feather from '@expo/vector-icons/Feather';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
const MODAL_WIDTH  = SCREEN_WIDTH * 0.82;

// Must match heroHeader paddingHorizontal and headerbutton size in TrackPlayer
export const OPTIONS_BUTTON_SIZE  = 40;
const BUTTON_RIGHT     = 20; // heroHeader paddingHorizontal
const BUTTON_EXTRA_TOP = 12; // extra offset below insets.top in heroHeader

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { label: 'Off', minutes: null },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OptionsModalProps {
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  insetsTop: number;
  playbackRate: number;
  onRateChange: (rate: number) => void;
  onDismiss: () => void;
  sleepMinutesLeft: number | null;
  onSleepTimer: (minutes: number | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OptionsModal({
  visible,
  onOpen,
  onClose,
  insetsTop,
  playbackRate,
  onRateChange,
  onDismiss,
  sleepMinutesLeft,
  onSleepTimer,
}: OptionsModalProps) {

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

  // Sleep timer "active" chip: highlight the option matching the value that
  // was set (mirrors the previous logic — active while minutesLeft is within
  // that option's ceiling and the timer is running).
  const isSleepActive = (minutes: number | null) =>
    minutes === null
      ? sleepMinutesLeft === null
      : sleepMinutesLeft !== null && minutes >= sleepMinutesLeft;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

      {/* Backdrop — behind card and button, closes on tap */}
      {isMounted && (
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
      )}

      {/* Card — expands from the button's top-right corner */}
      {isMounted && (
        <Animated.View
          style={[
            styles.card,
            { top: cardTop, right: BUTTON_RIGHT, width: MODAL_WIDTH },
            cardStyle,
          ]}
        >
          <Text style={styles.sectionTitle}>Playback Speed</Text>
          <View style={styles.chipRow}>
            {SPEEDS.map(speed => {
              const isActive = playbackRate === speed;
              return (
                <TouchableOpacity
                  key={speed}
                  style={[styles.chip, isActive && styles.chipActive]}
                  activeOpacity={0.7}
                  onPress={() => onRateChange(speed)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Sleep Timer</Text>
          <View style={styles.chipRow}>
            {SLEEP_OPTIONS.map(({ label, minutes }) => {
              const isActive = isSleepActive(minutes);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, isActive && styles.chipActive]}
                  activeOpacity={0.7}
                  onPress={() => { onSleepTimer(minutes); onClose(); }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.dismissRow}
            activeOpacity={0.6}
            onPress={onDismiss}
          >
            <Feather name="x-circle" size={16} color="#ff6b6b" />
            <Text style={styles.dismissText}>Close Player</Text>
          </TouchableOpacity>

        </Animated.View>
      )}

      {/* Button — always on top, overlays the card's top-right corner.
          Shows more-vertical when closed, X when open. */}
      <TouchableOpacity
        style={[styles.button, { top: buttonTop, right: BUTTON_RIGHT }]}
        onPress={visible ? onClose : onOpen}
        activeOpacity={0.7}
      >
        <Animated.View style={menuIconStyle}>
          <Feather name="more-vertical" size={24} color="#fff" />
        </Animated.View>
        <Animated.View style={closeIconStyle}>
          <Feather name="x" size={22} color="#fff" />
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
    backgroundColor: '#000',
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
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingTop: OPTIONS_BUTTON_SIZE + 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },

  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0,255,255,0.12)',
    borderColor: 'cyan',
  },
  chipText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: 'cyan',
  },

  dismissRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dismissText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },

});