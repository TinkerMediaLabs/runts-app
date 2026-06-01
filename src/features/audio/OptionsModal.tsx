import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from 'react-native';

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
const MODAL_WIDTH  = SCREEN_WIDTH * 0.8;

// Must match heroHeader paddingHorizontal and headerbutton size in TrackPlayer
const BUTTON_SIZE      = 40;
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
  onSleepTimer 
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

  // Scale from top-right corner.
  // Pivot = top-right of card = (MODAL_WIDTH/2, -cardHeight/2) from card centre.
  // Since we don't know height, we use scaleX/scaleY + translateX to keep the
  // right edge pinned. The top edge is pinned by the absolute `top` position.
  // translateX = (MODAL_WIDTH / 2) * (1 - scale) pushes the card rightward as
  // it shrinks so the right edge stays at BUTTON_RIGHT.
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

  // Button icon: more-vertical fades/rotates out, X fades/rotates in
  const menuIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));

  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 0.8], [0, 1]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [-45, 0])}deg` }],
    position: 'absolute',
  }));

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

          {[0.75, 1, 1.25, 1.5, 2].map((speed, index) => {
            const isActive = playbackRate === speed;
            return (
              <React.Fragment key={speed}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.6}
                  onPress={() => onRateChange(speed)}
                >
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                    {speed}x
                  </Text>
                  {isActive && <Feather name="check" size={16} color="cyan" />}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}

          {/* Sleep timer section */}
          <View style={[styles.divider, { marginHorizontal: 0, marginVertical: 8 }]} />
          <Text style={styles.sectionTitle}>Sleep Timer</Text>

          {[
            { label: 'Off',    minutes: null },
            { label: '15 min', minutes: 15  },
            { label: '30 min', minutes: 30  },
            { label: '45 min', minutes: 45  },
            { label: '60 min', minutes: 60  },
          ].map(({ label, minutes }, index) => {
            const isActive = minutes === null
              ? sleepMinutesLeft === null
              : sleepMinutesLeft !== null && minutes >= sleepMinutesLeft; // active if this was the set value
            return (
              <React.Fragment key={label}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.6}
                  onPress={() => { onSleepTimer(minutes); onClose(); }}
                >
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                    {label}
                  </Text>
                  {isActive && <Feather name="check" size={16} color="cyan" />}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}

          {/* Dismiss player */}
          <View style={styles.divider} />
            <TouchableOpacity
              style={styles.option}
              activeOpacity={0.6}
              onPress={onDismiss}
            >
              <Text style={[styles.optionLabel, { color: '#ff6b6b' }]}>Close Player</Text>
              <Feather name="x-circle" size={16} color="#ff6b6b" />
            </TouchableOpacity>

        </Animated.View>
      )}

      {/* Button — always on top, overlays the card's top-right corner.
          Shows more-vertical when closed, X when open. */}
      <TouchableOpacity
        style={[styles.button, { top: buttonTop, right: BUTTON_RIGHT }]}
        onPress={visible ? onClose : onOpen}
        activeOpacity={0.7}
        //pointerEvents="auto"
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
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    position: 'absolute',
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingTop: BUTTON_SIZE + 8, // push content below where the button sits on top
    paddingBottom: 12,
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
    marginHorizontal: 20,
  },

  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLabel: {
    color: '#fff',
    fontSize: 16,
  },

  optionLabelActive: {
    color: 'cyan',
    fontWeight: '600',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },

});