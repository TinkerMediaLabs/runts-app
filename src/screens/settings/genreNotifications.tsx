import React from 'react';
import { View, FlatList, ActivityIndicator, Switch, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from '@/components/common/Screen';
import MenuHeader from '../../components/common/MenuHeader';
import EmptyState from '../../components/common/EmptyState';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useFollowedTags, useSetTagNotify, useIsFollowingTag } from '../../hooks/queries/useTagFollowing';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

// One switch per followed genre. Pages of 30 so the list stays light however many genres are followed.
// Reads the follow state seeded by the list (no extra request) so the switch updates instantly when toggled.
const GenreRow = ({ tag, followRecord }: { tag: any; followRecord: any }) => {
    const { data: state } = useIsFollowingTag(tag.id);
    const { mutate: setNotify } = useSetTagNotify();
    const on = state ? state.notify !== false : followRecord?.notify !== false;
    const recordId = state?.recordId ?? followRecord?.id;
    return (
        <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{tag.name ?? 'Genre'}</Text>
            <Switch
                value={on}
                onValueChange={(v) => { if (recordId) setNotify({ recordId, tagId: tag.id, notify: v }); }}
                trackColor={{ false: colors.border, true: colors.accent }}
                accessibilityLabel={`Notifications for ${tag.name ?? 'genre'}`}
            />
        </View>
    );
};

const GenreNotificationsScreen = ({ navigation }: any) => {
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFollowedTags();
    const items: any[] = ((data as any)?.pages ?? []).flatMap((p: any) => p.items ?? []);

    return (
        <Screen>
            <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
                <MenuHeader title="Genre notifications" navigation={navigation} />
                {isLoading ? (
                    <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item: any) => item.tag.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                        onEndReachedThreshold={0.5}
                        ListHeaderComponent={items.length ? (
                            <Text style={styles.intro}>
                                Get a note when a new story appears in a genre you follow. You will get at most one genre note a day.
                            </Text>
                        ) : null}
                        renderItem={({ item }: any) => <GenreRow tag={item.tag} followRecord={item.followRecord} />}
                        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
                        ListEmptyComponent={
                            <EmptyState
                                icon={<FontAwesome5 name="tags" size={40} color={colors.textTertiary} iconStyle="solid" />}
                                title="No followed genres yet"
                                body="Follow a genre from its page and it will show up here, with a switch for its notifications."
                            />
                        }
                    />
                )}
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    intro: { color: colors.textSecondary, fontSize: fontSizes.small, paddingHorizontal: 20, paddingVertical: 14 },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 10, minHeight: 56,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    name: { color: colors.textPrimary, fontSize: fontSizes.body, flex: 1, marginRight: 12 },
});

export default GenreNotificationsScreen;
