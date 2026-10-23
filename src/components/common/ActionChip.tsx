import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/common/AppText';
import { subscribeChip, ChipMessage } from '@/lib/chip';

const SHOW_MS = 2200;
const ANIM_MS = 180;

export default function ActionChip() {
    const insets = useSafeAreaInsets();
    const [chip, setChip] = useState<ChipMessage | null>(null);
    const opacity    = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-12)).current;
    const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeChip((message) => {
            if (timer.current) clearTimeout(timer.current);
            setChip(message);
            opacity.setValue(0);
            translateY.setValue(-12);
            Animated.parallel([
                Animated.timing(opacity,    { toValue: 1, duration: ANIM_MS, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: ANIM_MS, useNativeDriver: true }),
            ]).start();
            timer.current = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity,    { toValue: 0,   duration: ANIM_MS, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: -12, duration: ANIM_MS, useNativeDriver: true }),
                ]).start(({ finished }) => {
                    if (finished) setChip(null);
                });
            }, SHOW_MS);
        });
        return () => {
            unsubscribe();
            if (timer.current) clearTimeout(timer.current);
        };
    }, [opacity, translateY]);

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
