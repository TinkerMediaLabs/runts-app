import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { audioEngine } from './audioEngine';
import { useStoryImage } from '@/hooks/queries/useStoryImage';
import { sceneIndexAt, type StoryScene } from '@/hooks/queries/useStoryScenes';
import { useReduceMotion } from '@/lib/useReduceMotion';

const POLL_MS = 400;
const FADE_MS = 700;

type Props = {
    scenes: StoryScene[];
    // Fires with the scene's alt text when the scene changes (used for screen reader announcements).
    onSceneChange?: (scene: StoryScene) => void;
};

// Picture-book hero: shows the scene for the current playback position and crossfades between scenes.
// Two layers swap roles so the old image stays visible until the new one has loaded. With Reduce Motion
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

    // Two layers: A and B. The incoming scene goes into the hidden layer, then fades in over the other.
    const [layerA, setLayerA] = useState<string | null>(null);
    const [layerB, setLayerB] = useState<string | null>(null);
    const showB = useRef(false);
    const opacityB = useSharedValue(0);

    useEffect(() => {
        if (!currentUrl) return;
        if (!layerA && !layerB) { setLayerA(currentUrl); return; }
        const visible = showB.current ? layerB : layerA;
        if (currentUrl === visible) return;
        if (showB.current) {
            setLayerA(currentUrl);
            opacityB.value = reduceMotion ? 0 : withTiming(0, { duration: FADE_MS });
            showB.current = false;
        } else {
            setLayerB(currentUrl);
            opacityB.value = reduceMotion ? 1 : withTiming(1, { duration: FADE_MS });
            showB.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUrl, reduceMotion]);

    const styleB = useAnimatedStyle(() => ({ opacity: opacityB.value }));

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
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            {layerA ? <Image source={{ uri: layerA }} style={StyleSheet.absoluteFill} resizeMode="contain" fadeDuration={0} /> : null}
            {layerB ? (
                <Animated.Image source={{ uri: layerB }} style={[StyleSheet.absoluteFill, styleB]} resizeMode="contain" fadeDuration={0} />
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
