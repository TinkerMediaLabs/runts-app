import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import Screen from '@/components/common/Screen';
import Button from '@/components/common/Button';
import { layout } from '@/theme/tokens';
import MenuHeader from '../../components/common/MenuHeader';
import GenreChip from '../../components/common/GenreChip';
import { showChip } from '@/lib/chip';
import { unwrap } from '@/lib/amplifyResult';
import { useApp } from '../../context/AppContext';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import { useTasteProfile } from '../../hooks/queries/useTasteProfile';
import { markGenresSeen } from '../../lib/genreNudge';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

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

    // Drop saved genres that no longer exist (renamed, deleted or no longer primary). Without this they stay
    // hidden in the selection, count toward the limit of 3 and block picking anything new.
    useEffect(() => {
        if (!genres.length) return;
        const live = new Set(genres.map((g: any) => g.id));
        setSelected(prev => (prev.every(id => live.has(id)) ? prev : prev.filter(id => live.has(id))));
    }, [genres.length, profile?.preferredTagIds?.join(',')]);

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
            <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
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
                    <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
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
                    <Button
                        label="Save"
                        accessibilityLabel="Save genres"
                        loading={saving}
                        disabled={!selected.length || !changed}
                        onPress={save}
                    />
                </View>
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    subtitle: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 22, marginHorizontal: 20, marginTop: 16 },
    learned: { color: colors.textSecondary, fontSize: fontSizes.small, lineHeight: 19, marginHorizontal: 20, marginTop: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: layout.gutter, paddingTop: 16, paddingBottom: 20, gap: 10 },
    footer: { paddingHorizontal: layout.gutter, paddingTop: 12, gap: 12 },
    count: { textAlign: 'center', fontSize: fontSizes.small, color: colors.textSecondary, fontWeight: '500' },
});

export default EditGenresScreen;
