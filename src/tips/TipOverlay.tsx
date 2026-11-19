import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withDelay, withSpring, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Text } from '@/components/common/AppText';
import { useReduceMotion } from '@/lib/useReduceMotion';
import {
  loadTips, useTipsState, getTipsState, getTargetRef, markTipSeen, setTipsEnabled, setTipsRoute,
} from './tipsStore';
import { tipIsEligible } from './tipRules';
import { navigationRef } from '@/navigation/RootNavigator';
import { TIPS, type Tip } from './tips';
import { colors } from '@/theme/colors';

const SETTLE_MS = 600;          // let the screen finish animating before measuring
const PAD = 10;                 // breathing room around the highlighted control
const DIM = 'rgba(0,0,0,0.6)';   // a gentle dim, so the screen is still readable behind the spotlight
const ACCENT = '#00ffff';

type Active = { tip: Tip; x: number; y: number; w: number; h: number };

// The screen showing right now, straight from the navigator (null before it is ready).
const liveRoute = (): string | null =>
  navigationRef.current?.isReady() ? navigationRef.current.getCurrentRoute()?.name ?? null : null;

// One tip at a time, pointing at a real control, as a small animated spotlight: the screen dims gently, the control is
// left lit inside a soft lens that pops up slightly, a teal ring expands and fades around it, and a speech bubble with
// a tail pointing at the control appears next to it ("Got it" / "Turn off tips"). With Reduce Motion everything
// appears at once and the ring stays still.
export default function TipOverlay({ blocked }: { blocked: boolean }) {
  const { loaded, enabled, seen, route, flags, version } = useTipsState();
  const reduceMotion = useReduceMotion();
  const [active, setActive] = useState<Active | null>(null);
  // The overlay's own box. Controls are measured RELATIVE TO THIS, so the spotlight always lines up even
  // with status bar / edge-to-edge differences between phones.
  const rootRef = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const fade = useSharedValue(0);       // the dim
  const pop = useSharedValue(0);        // the lens around the control
  const ringA = useSharedValue(0);      // two rings, half a cycle apart
  const ringB = useSharedValue(0);
  const bubble = useSharedValue(0);     // the speech bubble

  useEffect(() => { loadTips(); }, []);

  // Keep the current screen name fresh. Navigation events alone miss the first screen after sign-in,
  // so also check twice a second (cheap: reads a name, only updates when it changed).
  useEffect(() => {
    const sync = () => {
      if (navigationRef.current?.isReady()) setTipsRoute(navigationRef.current.getCurrentRoute()?.name);
    };
    sync();
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, []);

  // Judged against the LIVE route and store every time, never values captured when a wait began, so a screen
  // change during the settle delay or the measuring callbacks cancels the tip.
  const eligible = (tip: Tip) => {
    const s = getTipsState();
    return s.enabled && tipIsEligible(tip, {
      seen: s.seen, route: liveRoute() ?? s.route, flags: s.flags, hasTarget: !!getTargetRef(tip.target),
    });
  };

  // Decide what to show whenever anything relevant changes.
  useEffect(() => {
    if (!loaded || !enabled || blocked) { setActive(null); return; }
    if (active && eligible(active.tip)) return;      // still valid
    if (active) setActive(null);

    const next = [...TIPS].sort((a, b) => a.order - b.order).find(eligible);
    if (!next) return;

    const timer = setTimeout(() => {
      const ref = getTargetRef(next.target);
      const root = rootRef.current;
      if (!ref?.current?.measureInWindow || !root?.measureInWindow || size.width === 0) return;
      // Measure the overlay and the control in the same (window) coordinates, then subtract the
      // overlay's own origin. That cancels any status bar / edge-to-edge offset between phones.
      root.measureInWindow((rx: number, ry: number) => {
        ref.current.measureInWindow((wx: number, wy: number, w: number, h: number) => {
          const x = wx - rx;
          const y = wy - ry;
          const onScreen = w > 0 && h > 0 && x >= -1 && y >= 0 && x + w <= size.width + 1 && y + h <= size.height + 1;
          if (onScreen && eligible(next)) setActive({ tip: next, x, y, w, h });
        });
      });
    }, SETTLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, enabled, blocked, seen, route, flags, version, active?.tip.id, size.width]);

  // Animate in / announce.
  useEffect(() => {
    if (!active) { fade.value = 0; pop.value = 0; bubble.value = 0; ringA.value = 0; ringB.value = 0; return; }
    if (reduceMotion) {
      fade.value = 1; pop.value = 1; bubble.value = 1; ringA.value = 0; ringB.value = 0;
    } else {
      fade.value = withTiming(1, { duration: 420 });                                         // the screen gently darkens
      pop.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 150, mass: 0.7 })); // the control scales up slightly
      bubble.value = withDelay(380, withSpring(1, { damping: 14, stiffness: 160 }));         // then the bubble appears
      const cycle = (delay: number) => withDelay(delay, withRepeat(
        withSequence(withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 300 })),
        -1,
      ));
      ringA.value = 0; ringB.value = 0;
      ringA.value = cycle(250);
      ringB.value = cycle(1050);
    }
    AccessibilityInfo.announceForAccessibility(`${active.tip.title}. ${active.tip.body}`);
    return () => { cancelAnimation(ringA); cancelAnimation(ringB); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.tip.id, reduceMotion]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const lensStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.82 + pop.value * 0.18 }] }));
  const ringAStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0.9 : (1 - ringA.value) * 0.85, transform: [{ scale: reduceMotion ? 1 : 1 + ringA.value * 0.75 }] }));
  const ringBStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0 : (1 - ringB.value) * 0.6, transform: [{ scale: 1 + ringB.value * 0.75 }] }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, bubble.value),
    transform: [{ translateY: (1 - bubble.value) * 10 }, { scale: 0.9 + bubble.value * 0.1 }],
  }));

  const frame = (children: React.ReactNode) => (
    <View
      ref={rootRef}
      collapsable={false}
      pointerEvents="box-none"
      style={styles.frame}
      onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {children}
    </View>
  );

  if (!active) return frame(null);

  const { width: W, height: H } = size;
  const hx = Math.max(0, active.x - PAD);
  const hy = Math.max(0, active.y - PAD);
  const hw = Math.min(W - hx, active.w + PAD * 2);
  const hh = Math.min(H - hy, active.h + PAD * 2);
  // A squarish control (an icon) gets a round spotlight; a wide one (a bar) gets a rounded rectangle.
  const squarish = Math.max(hw, hh) / Math.min(hw, hh) < 1.3;
  const r = squarish ? Math.min(hw, hh) / 2 : Math.min(18, Math.min(hw, hh) / 2);

  const cardW = Math.min(W - 32, 340);
  const cardLeft = Math.min(Math.max(16, hx + hw / 2 - cardW / 2), W - cardW - 16);
  const below = hy + hh / 2 < H / 2;
  const GAP = 18;
  const cardPos = below ? { top: hy + hh + GAP } : { bottom: H - hy + GAP };
  // The tail points at the middle of the control, kept inside the bubble's rounded corners.
  const tailX = Math.min(Math.max(hx + hw / 2 - cardLeft - TAIL / 2, 22), cardW - 22 - TAIL);

  const dismiss = () => { markTipSeen(active.tip.id); setActive(null); };
  const turnOff = () => { markTipSeen(active.tip.id); setTipsEnabled(false); setActive(null); };

  return frame(
    <View style={styles.root} accessibilityViewIsModal pointerEvents="auto">
      {/* The dim, with a rounded hole where the control is. A tap anywhere closes the tip. */}
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]} pointerEvents="none">
        <Svg width={W} height={H}>
          <Defs>
            <Mask id="spot">
              <Rect x={0} y={0} width={W} height={H} fill="white" />
              <Rect x={hx} y={hy} width={hw} height={hh} rx={r} ry={r} fill="black" />
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={DIM} mask="url(#spot)" />
        </Svg>
      </Animated.View>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="none" accessibilityElementsHidden importantForAccessibility="no" />

      {/* The lens (a soft light that pops up slightly) and two teal rings that expand and fade. */}
      <Animated.View pointerEvents="none" style={[styles.lens, { left: hx, top: hy, width: hw, height: hh, borderRadius: r }, lensStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ring, { left: hx, top: hy, width: hw, height: hh, borderRadius: r }, ringAStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ring, { left: hx, top: hy, width: hw, height: hh, borderRadius: r }, ringBStyle]} />

      <Animated.View style={[styles.bubble, { width: cardW, left: cardLeft }, cardPos, bubbleStyle]}>
        <View
          pointerEvents="none"
          style={[styles.tail, { left: tailX }, below ? styles.tailTop : styles.tailBottom]}
        />
        <Text style={styles.title} accessibilityRole="header">{active.tip.title}</Text>
        <Text style={styles.body}>{active.tip.body}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={turnOff} accessibilityRole="button" accessibilityLabel="Turn off tips" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.off}>Turn off tips</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismiss} style={styles.gotIt} accessibilityRole="button" accessibilityLabel="Got it">
            <Text style={styles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const TAIL = 16;

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFillObject, zIndex: 9000, elevation: 9000 },
  root: { ...StyleSheet.absoluteFillObject },
  lens: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.10)' },
  ring: { position: 'absolute', borderWidth: 2.5, borderColor: ACCENT },
  bubble: {
    position: 'absolute',
    backgroundColor: '#161819',
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: ACCENT, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  // A square turned 45 degrees, half hidden behind the bubble: its two outer edges make the tail.
  tail: {
    position: 'absolute', width: TAIL, height: TAIL, backgroundColor: '#161819',
    transform: [{ rotate: '45deg' }], borderColor: 'rgba(255,255,255,0.18)',
  },
  tailTop: { top: -TAIL / 2, borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth },
  tailBottom: { bottom: -TAIL / 2, borderBottomWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  off: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  gotIt: { backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22 },
  gotItText: { color: colors.textOnAccent, fontWeight: '700', fontSize: 14 },
});
