import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { audioEngine } from './audioEngine';
import { useStoryImage } from '@/hooks/queries/useStoryImage';
import { sceneIndexAt, type StoryScene } from '@/hooks/queries/useStoryScenes';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { colors } from '@/theme/colors';

const POLL_MS = 400;
const FADE_OUT_MS = 500;
const FADE_IN_MS = 800;

type Props = {
    scenes: StoryScene[];
    // Fires with the scene's alt text when the scene changes (used for screen reader announcements).
    onSceneChange?: (scene: StoryScene) => void;
};

// Picture-book hero: shows the scene for the current playback position and fades out and in between scenes.
// The old image fades to black, the new one preloads, then fades in. With Reduce Motion
// on, scenes change instantly. Renders square scene art uncropped (contain) on black.
export default function SceneHero({ scenes, onSceneChange }: Props) {
    const reduceMotion = useReduceMotion();
    const [index, setIndex] = useState(0);
    const lastIndexRef = useRef(0);

    // Poll the playback position (cheap: one binary search) and only set state when the scene changes.
    useEffect(() => {
        if (scenes.length === 0) return;
        const tick = () => {
            const next = sceneIndexAt(scenes, audioEngine.getCurrentPosition());
            if (next !== lastIndexRef.current) {
                lastIndexRef.current = next;
                setIndex(next);
            }
        };
        tick();
        const id = setInterval(tick, POLL_MS);
        return () => clearInterval(id);
    }, [scenes]);

    const current = scenes[Math.min(index, scenes.length - 1)];
    const next = scenes[index + 1];

    // Prefer the on-device file (offline downloads); only ask for a signed URL when there isn't one.
    const { data: currentRemote } = useStoryImage(current?.localUri ? null : current?.imageUri);
    const { data: nextRemote } = useStoryImage(next?.localUri ? null : next?.imageUri);
    const currentUrl = current?.localUri ?? currentRemote;
    const nextUrl = next?.localUri ?? nextRemote;

    // Prefetch the next scene so the crossfade never waits on the network.
    useEffect(() => {
        if (nextUrl) Image.prefetch(nextUrl).catch(() => {});
    }, [nextUrl]);

    // One layer that fades out, swaps to the new scene once it is ready, then fades in. The image is
    // preloaded before the swap so the new scene never pops in half-loaded.
    const [shownUrl, setShownUrl] = useState<string | null>(null);
    const shownRef = useRef<string | null>(null);
    const opacity = useSharedValue(0);

    const swapTo = (url: string) => {
        shownRef.current = url;
        setShownUrl(url);
        opacity.value = reduceMotion ? 1 : withTiming(1, { duration: FADE_IN_MS });
    };

    useEffect(() => {
        if (!currentUrl || currentUrl === shownRef.current) return;
        let cancelled = false;
        const go = () => { if (!cancelled) swapTo(currentUrl); };
        const preloadThenSwap = (url: string) => {
            Image.prefetch(url).catch(() => {}).finally(() => { if (!cancelled) swapTo(url); });
        };
        if (!shownRef.current || reduceMotion) { go(); return; }
        opacity.value = withTiming(0, { duration: FADE_OUT_MS }, finished => {
            if (finished) runOnJS(preloadThenSwap)(currentUrl);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUrl, reduceMotion]);

    const imageStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    // Tell the parent when the scene changes (skips the very first scene).
    const announcedFirst = useRef(false);
    useEffect(() => {
        if (!current) return;
        if (!announcedFirst.current) { announcedFirst.current = true; return; }
        onSceneChange?.(current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.id]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface0 }]} />
            {shownUrl ? (
                <Animated.Image source={{ uri: shownUrl }} style={[StyleSheet.absoluteFill, imageStyle]} resizeMode="contain" fadeDuration={0} />
            ) : null}
        </View>
    );
}

export function announceScene(scene: StoryScene) {
    if (!scene.altText) return;
    AccessibilityInfo.isScreenReaderEnabled()
        .then(on => { if (on) AccessibilityInfo.announceForAccessibility(scene.altText); })
        .catch(() => {});
}
