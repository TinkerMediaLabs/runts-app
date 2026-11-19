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
import { usePickerMoods, usePickerLengths } from '../../hooks/queries/usePickerOptions';
import TasteChoices from '../../components/taste/TasteChoices';
import { TASTE_VERSION } from '../auth/welcomeTaste';
import { useTasteProfile } from '../../hooks/queries/useTasteProfile';
import { markGenresSeen } from '../../lib/genreNudge';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

// "Your taste": change the genres (1 to 3), moods (up to 3) and lengths that shape For You. The genre list always shows
// every current genre, so genres added after sign-up can be chosen here. Moods and lengths come from the CMS.
const EditGenresScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { profile, refreshAuth, userId } = useApp();
    const { data: allTags = [], isLoading } = usePrimaryTags();
    const genres = allTags.filter((t: any) => !t.isErotic);

    const current = profile?.preferredTagIds ?? [];
    const [selected, setSelected] = useState<string[]>(current);
    const [saving, setSaving] = useState(false);

    const moodQ = usePickerMoods();
    const lengthQ = usePickerLengths();
    const currentMoods = profile?.preferredMoodTagIds ?? [];
    const currentLengths = profile?.preferredLengths ?? [];
    const [moods, setMoods] = useState<string[]>(currentMoods);
    const [lengths, setLengths] = useState<string[]>(currentLengths);
    useEffect(() => { setMoods(profile?.preferredMoodTagIds ?? []); }, [profile?.preferredMoodTagIds?.join(',')]);
    useEffect(() => { setLengths(profile?.preferredLengths ?? []); }, [profile?.preferredLengths?.join(',')]);
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

    const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
    const changed = selected.join(',') !== current.join(',') || !sameSet(moods, currentMoods) || !sameSet(lengths, currentLengths);

    const save = async () => {
        if (!selected.length || !changed) return;
        setSaving(true);
        try {
            const client = generateClient<Schema>();
            const { userId: uid } = await getCurrentUser();
            unwrap(await client.models.User.update({
                id: uid, preferredTagIds: selected, preferredMoodTagIds: moods, preferredLengths: lengths, tasteVersion: TASTE_VERSION,
            }), 'Save your taste');
            await refreshAuth();
            queryClient.invalidateQueries({ queryKey: ['stories', 'forYou'] });
            queryClient.invalidateQueries({ queryKey: ['taste'] });
            showChip('Taste saved', 'success');
            navigation.goBack();
        } catch (e: any) {
            showChip('Could not save. Check your connection and try again.', 'error');
            setSaving(false);
        }
    };

    return (
        <Screen gradient>
            <View style={{ flex: 1 }}>
                <MenuHeader title="Today's Listening Mood" navigation={navigation} />
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    <Text style={styles.heading}>What do you reach for?</Text>
                    <Text style={styles.subtitle}>Pick up to 3 moods, or none to be surprised.</Text>
                    <View style={styles.section}>
                        <TasteChoices
                            choices={(moodQ.data ?? []).map((t: any) => ({ id: t.id, title: t.name, color: t.color }))}
                            selected={moods}
                            onChange={setMoods}
                            max={3}
                            loading={moodQ.isLoading}
                            emptyText="No moods to choose from yet."
                        />
                    </View>

                    <Text style={styles.heading}>How long is your usual listen?</Text>
                    <Text style={styles.subtitle}>Pick as many as you like, or none if any length works.</Text>
                    <View style={styles.section}>
                        <TasteChoices
                            choices={(lengthQ.data ?? []).map((o: any) => ({ id: o.key, title: o.label, subtitle: o.subtitle }))}
                            selected={lengths}
                            onChange={setLengths}
                            loading={lengthQ.isLoading}
                            emptyText="No lengths to choose from yet."
                        />
                    </View>
                    <Text style={styles.heading}>Genres</Text>
                    <Text style={styles.subtitle}>Pick up to 3. They shape the For You list on Home.</Text>
                    {learned.length > 0 && (
                        <Text style={styles.learned}>
                            You have also been listening to {learned.join(' and ')}, so those show up in For You too.
                        </Text>
                    )}
                    {isLoading ? (
                        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
                    ) : (
                        <View style={styles.grid}>
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
                        </View>
                    )}

                </ScrollView>
                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={styles.count}>{selected.length}/3 genres selected</Text>
                    <Button
                        label="Save"
                        accessibilityLabel="Save your taste"
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
    content: { paddingBottom: 24 },
    heading: { color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: '700', marginHorizontal: 20, marginTop: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: layout.gutter, paddingTop: 16, gap: 10 },
    section: { paddingHorizontal: layout.gutter, paddingTop: 14 },
    footer: { paddingHorizontal: layout.gutter, paddingTop: 12, gap: 12 },
    count: { textAlign: 'center', fontSize: fontSizes.small, color: colors.textSecondary, fontWeight: '500' },
});

export default EditGenresScreen;
