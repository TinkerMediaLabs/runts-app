import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import Screen from '@/components/common/Screen';
import MenuHeader from '../../components/common/MenuHeader';
import GenreChip from '../../components/common/GenreChip';
import { showChip } from '@/lib/chip';
import { unwrap } from '@/lib/amplifyResult';
import { useApp } from '../../context/AppContext';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import { useTasteProfile } from '../../hooks/queries/useTasteProfile';
import { markGenresSeen } from '../../lib/genreNudge';

// Change the genres that shape For You. Anyone can pick 1 to 3; the list always shows every current genre,
// so genres added after sign-up can be chosen here.
const EditGenresScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { profile, refreshAuth, userId } = useApp();
    const { data: allTags = [], isLoading } = usePrimaryTags();
    const genres = allTags.filter((t: any) => !t.isErotic);

    const current = profile?.preferredTagIds ?? [];
    const [selected, setSelected] = useState<string[]>(current);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setSelected(profile?.preferredTagIds ?? []); }, [profile?.preferredTagIds?.join(',')]);

    // Having looked at the full list, every genre counts as seen (clears the "new genre" note on Home).
    useEffect(() => {
        if (userId && genres.length) markGenresSeen(userId, genres.map((g: any) => g.id));
    }, [userId, genres.length]);

    const { data: taste } = useTasteProfile(current);
    const learned = (taste?.learnedTagIds ?? [])
        .map(id => genres.find((g: any) => g.id === id)?.name)
        .filter(Boolean) as string[];

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
    };

    const changed = selected.join(',') !== current.join(',');

    const save = async () => {
        if (!selected.length || !changed) return;
        setSaving(true);
        try {
            const client = generateClient<Schema>();
            const { userId: uid } = await getCurrentUser();
            unwrap(await client.models.User.update({ id: uid, preferredTagIds: selected }), 'Save your genres');
            await refreshAuth();
            queryClient.invalidateQueries({ queryKey: ['stories', 'forYou'] });
            queryClient.invalidateQueries({ queryKey: ['taste'] });
            showChip('Genres saved', 'success');
            navigation.goBack();
        } catch (e: any) {
            showChip('Could not save. Check your connection and try again.', 'error');
            setSaving(false);
        }
    };

    return (
        <Screen>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <MenuHeader title="Your genres" navigation={navigation} />
                <Text style={styles.subtitle}>
                    Pick up to 3 genres. They shape the For You list on Home.
                </Text>
                {learned.length > 0 && (
                    <Text style={styles.learned}>
                        You have also been listening to {learned.join(' and ')}, so those show up in For You too.
                    </Text>
                )}
                {isLoading ? (
                    <View style={styles.center}><ActivityIndicator color="cyan" size="large" /></View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
                        {genres.map((tag: any, i: number) => (
                            <GenreChip
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                icon={tag.icon}
                                selected={selected.includes(tag.id)}
                                onPress={() => toggle(tag.id)}
                                delay={Math.min(i, 10) * 30}
                            />
                        ))}
                    </ScrollView>
                )}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={styles.count}>{selected.length}/3 selected</Text>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={!selected.length || !changed || saving}
                        onPress={save}
                        accessibilityRole="button"
                        accessibilityLabel={saving ? 'Saving, please wait' : 'Save genres'}
                        accessibilityState={{ disabled: !selected.length || !changed || saving, busy: saving }}
                        style={[styles.cta, (!selected.length || !changed || saving) && { opacity: 0.35 }]}
                    >
                        {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.ctaText}>Save</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 22, marginHorizontal: 20, marginTop: 16 },
    learned: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 19, marginHorizontal: 20, marginTop: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 10 },
    footer: { paddingHorizontal: 24, paddingTop: 12, gap: 12 },
    count: { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
    cta: { backgroundColor: 'cyan', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
    ctaText: { fontSize: 17, fontWeight: '800', color: '#000' },
});

export default EditGenresScreen;
