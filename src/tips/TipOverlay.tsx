import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { Text } from '@/components/common/AppText';
import { useReduceMotion } from '@/lib/useReduceMotion';
import {
  loadTips, useTipsState, getTargetRef, markTipSeen, setTipsEnabled, setTipsRoute,
} from './tipsStore';
import { navigationRef } from '@/navigation/RootNavigator';
import { TIPS, type Tip } from './tips';
import { colors } from '@/theme/colors';

const SETTLE_MS = 600;          // let the screen finish animating before measuring
const PAD = 8;                  // breathing room around the highlighted control
const DIM = 'rgba(0,0,0,0.78)';
const ACCENT = '#00ffff';

type Active = { tip: Tip; x: number; y: number; w: number; h: number };

// One tip at a time, pointing at a real control. Dims the screen, leaves a spotlight around the control,
// pulses a ring (static with Reduce Motion), and shows a card with "Got it" / "Turn off tips".
export default function TipOverlay({ blocked }: { blocked: boolean }) {
  const { loaded, enabled, seen, route, flags, version } = useTipsState();
  const reduceMotion = useReduceMotion();
  const [active, setActive] = useState<Active | null>(null);
  // The overlay's own box. Controls are measured RELATIVE TO THIS, so the spotlight always lines up even
  // with status bar / edge-to-edge differences between phones.
  const rootRef = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const fade = useSharedValue(0);
  const pulse = useSharedValue(0);
  const lift = useSharedValue(12);

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

  const eligible = (tip: Tip) =>
    !seen.includes(tip.id) &&
    !!route && tip.routes.includes(route) &&
    (!tip.needs || flags[tip.needs]) &&
    !!getTargetRef(tip.target);

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
    if (!active) { fade.value = 0; return; }
    lift.value = reduceMotion ? 0 : 12;
    fade.value = reduceMotion ? 1 : withTiming(1, { duration: 280 });
    lift.value = reduceMotion ? 0 : withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    if (!reduceMotion) {
      pulse.value = 0;
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
                     withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        -1,
      );
    }
    AccessibilityInfo.announceForAccessibility(`${active.tip.title}. ${active.tip.body}`);
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.tip.id, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : 0.95 - pulse.value * 0.55,
    transform: [{ scale: reduceMotion ? 1 : 1 + pulse.value * 0.1 }],
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

  const cardW = Math.min(W - 32, 360);
  const cardLeft = Math.min(Math.max(16, hx + hw / 2 - cardW / 2), W - cardW - 16);
  const below = hy + hh / 2 < H / 2;
  const cardPos = below ? { top: hy + hh + 16 } : { bottom: H - hy + 16 };

  const dismiss = () => { markTipSeen(active.tip.id); setActive(null); };
  const turnOff = () => { markTipSeen(active.tip.id); setTipsEnabled(false); setActive(null); };

  return frame(
    <Animated.View style={[styles.root, overlayStyle]} accessibilityViewIsModal pointerEvents="auto">
      {/* Dim everything except the spotlight (four rectangles around it). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="none" accessibilityElementsHidden importantForAccessibility="no" />
      <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: hy }]} />
      <View pointerEvents="none" style={[styles.dim, { top: hy + hh, left: 0, right: 0, bottom: 0 }]} />
      <View pointerEvents="none" style={[styles.dim, { top: hy, left: 0, width: hx, height: hh }]} />
      <View pointerEvents="none" style={[styles.dim, { top: hy, left: hx + hw, right: 0, height: hh }]} />

      <Animated.View pointerEvents="none" style={[styles.ring, { left: hx, top: hy, width: hw, height: hh }, ringStyle]} />

      <Animated.View style={[styles.card, { width: cardW, left: cardLeft }, cardPos, cardStyle]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFillObject, zIndex: 9000, elevation: 9000 },
  root: { ...StyleSheet.absoluteFillObject },
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderRadius: 18, borderWidth: 2, borderColor: ACCENT },
  card: {
    position: 'absolute',
    backgroundColor: '#161819',
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  off: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  gotIt: { backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22 },
  gotItText: { color: colors.textOnAccent, fontWeight: '700', fontSize: 14 },
});
