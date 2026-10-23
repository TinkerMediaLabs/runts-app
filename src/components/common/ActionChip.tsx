import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/common/AppText';
import { subscribeChip, ChipMessage } from '@/lib/chip';
import { useReduceMotion } from '@/lib/useReduceMotion';

const SHOW_MS = 2200;
const ANIM_MS = 180;

export default function ActionChip() {
    const insets = useSafeAreaInsets();
    const reduceMotion = useReduceMotion();
    const [chip, setChip] = useState<ChipMessage | null>(null);
    const opacity    = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-12)).current;
    const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeChip((message) => {
            if (timer.current) clearTimeout(timer.current);
            setChip(message);
            // The chip is not focusable, so tell screen readers directly.
            AccessibilityInfo.announceForAccessibility(message.text);
            const ms = reduceMotion ? 0 : ANIM_MS;
            opacity.setValue(0);
            translateY.setValue(reduceMotion ? 0 : -12);
            Animated.parallel([
                Animated.timing(opacity,    { toValue: 1, duration: ms, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: ms, useNativeDriver: true }),
            ]).start();
            timer.current = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity,    { toValue: 0,   duration: ms, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: reduceMotion ? 0 : -12, duration: ms, useNativeDriver: true }),
                ]).start(({ finished }) => {
                    if (finished) setChip(null);
                });
            }, SHOW_MS);
        });
        return () => {
            unsubscribe();
            if (timer.current) clearTimeout(timer.current);
        };
    }, [opacity, translateY, reduceMotion]);

    if (!chip) return null;

    const accent = chip.kind === 'error' ? '#ff5a5f' : '#00ffff';

    return (
        <View pointerEvents="none" style={[styles.wrapper, { top: insets.top + 8 }]}>
            <Animated.View
                style={[
                    styles.chip,
                    { borderColor: accent, opacity, transform: [{ translateY }] },
                ]}
            >
                <Text style={styles.text}>{chip.text}</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    chip: {
        backgroundColor: 'rgba(28,28,30,0.96)',
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxWidth: '88%',
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});
