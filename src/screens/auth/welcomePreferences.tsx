import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';

import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import Screen from '@/components/common/Screen';
import GenreChip from '../../components/common/GenreChip';
import { usePrimaryTags } from '../../hooks/queries/useTags';

import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useApp } from '../../context/AppContext';
import { unwrap } from '@/lib/amplifyResult';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const WelcomePreferences = ({ navigation, route }: any) => {

    const insets     = useSafeAreaInsets();
    const { refreshAuth } = useApp();

    const { data: allTags = [], isLoading } = usePrimaryTags();
    const genres = allTags.filter((t: any) => !t.isErotic);

    const [selected, setSelected] = useState<string[]>([]);
    const [saving,   setSaving]   = useState(false);

    const toggleGenre = (id: string) => {
        if (selected.includes(id)) {
            setSelected(prev => prev.filter(i => i !== id));
        } else if (selected.length < 3) {
            setSelected(prev => [...prev, id]);
        }
    };

    const handleContinue = async () => {
        if (selected.length !== 3) return;
        setSaving(true);
        try {
            const client = generateClient<Schema>();
            const { userId } = await getCurrentUser();
            const birthdate = route?.params?.birthdate ?? null;

            unwrap(await client.models.User.update({
                id: userId,
                birthdate,
                onboardingComplete: true,
                preferredTagIds: selected,
            }), 'Save your preferences');

            await refreshAuth();
        } catch (e: any) {
            console.error('WelcomePreferences error:', e?.message ?? e);
            setSaving(false);
        }
    };

    const canContinue = selected.length === 3;

    return (
        <Screen>
            <LinearGradient
                colors={['#0a0a14', '#000', '#000']}
                style={{ flex: 1 }}
            >
                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInUp.duration(600)}
                    style={[styles.header, { paddingTop: insets.top + 24 }]}
                >
                    <Text style={styles.title}>Pick your genres</Text>
                    <Text style={styles.subtitle}>
                        Choose 3 genres to personalise your experience
                    </Text>

                    {/* Progress dots */}
                    <View style={styles.progressRow}>
                        {[0, 1, 2].map(i => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    i < selected.length && styles.progressDotActive,
                                ]}
                            />
                        ))}
                    </View>
                </Animated.View>

                {/* ── Genre grid ── */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="cyan" size="large" />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.grid}
                    >
                        {genres.map((tag: any, index: number) => (
                            <GenreChip
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                icon={tag.icon}
                                selected={selected.includes(tag.id)}
                                onPress={() => toggleGenre(tag.id)}
                                delay={index * 40}
                            />
                        ))}
                    </ScrollView>
                )}

                {/* ── Footer CTA ── */}
                <Animated.View
                    entering={FadeInDown.delay(300).duration(600)}
                    style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}
                >
                    <Text style={styles.selectionCount}>
                        {selected.length}/3 selected
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={!canContinue || saving}
                        onPress={handleContinue}
                        accessibilityRole="button"
                        accessibilityLabel={saving ? 'Saving, please wait' : 'Continue'}
                        accessibilityState={{ disabled: !canContinue || saving, busy: saving }}
                        style={[
                            styles.cta,
                            (!canContinue || saving) && styles.ctaDisabled,
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <Text style={styles.ctaText}>Continue</Text>
                                <FontAwesome5
                                    name="arrow-right"
                                    size={14}
                                    color="#000"
                                    iconStyle="solid"
                                />
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

            </LinearGradient>
        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    header: {
        paddingHorizontal: 28,
        paddingBottom: 20,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.2,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 22,
        marginBottom: 20,
    },
    progressRow: {
        flexDirection: 'row',
        gap: 8,
    },
    progressDot: {
        width: 24,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    progressDotActive: {
        backgroundColor: 'cyan',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingBottom: 20,
        gap: 10,
    },


    footer: {
        paddingHorizontal: 24,
        paddingTop: 12,
        gap: 12,
    },
    selectionCount: {
        textAlign: 'center',
        fontSize: 13,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '500',
    },
    cta: {
        backgroundColor: 'cyan',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 54,
    },
    ctaDisabled: {
        opacity: 0.35,
    },
    ctaText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 0.2,
    },
});

export default WelcomePreferences;