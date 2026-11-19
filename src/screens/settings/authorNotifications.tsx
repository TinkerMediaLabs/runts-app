import React from 'react';
import { View, FlatList, ActivityIndicator, Switch, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from '@/components/common/Screen';
import MenuHeader from '../../components/common/MenuHeader';
import EmptyState from '../../components/common/EmptyState';
import { useFollowedAuthors, useIsFollowing, useSetAuthorNotify } from '../../hooks/queries/useAuthorFollowing';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

// Reads the follow state seeded by the list (no extra request) so the switch updates instantly when toggled.
const AuthorRow = ({ author, followRecord }: { author: any; followRecord: any }) => {
    const { data: state } = useIsFollowing(author.id);
    const { mutate: setNotify } = useSetAuthorNotify();
    const on = state ? state.notify !== false : followRecord?.notify !== false;
    const recordId = state?.recordId ?? followRecord?.id;
    return (
        <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{author.name ?? 'Author'}</Text>
            <Switch
                value={on}
                onValueChange={(v) => { if (recordId) setNotify({ recordId, authorId: author.id, notify: v }); }}
                trackColor={{ false: colors.border, true: colors.accent }}
                accessibilityLabel={`Notifications for ${author.name ?? 'author'}`}
            />
        </View>
    );
};

// One switch per followed author. Pages of 20 so the list stays light however many authors are followed.
const AuthorNotificationsScreen = ({ navigation }: any) => {
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFollowedAuthors();
    const items: any[] = ((data as any)?.pages ?? []).flatMap((p: any) => p.items ?? []);

    return (
        <Screen gradient>
            <View style={{ flex: 1 }}>
                <MenuHeader title="Author notifications" navigation={navigation} />
                {isLoading ? (
                    <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item: any) => item.author.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                        onEndReachedThreshold={0.5}
                        ListHeaderComponent={items.length ? (
                            <Text style={styles.intro}>
                                Get a note when a new story appears from an author you follow. The switch at the top of Notifications turns all author notes on or off.
                            </Text>
                        ) : null}
                        renderItem={({ item }: any) => <AuthorRow author={item.author} followRecord={item.followRecord} />}
                        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
                        ListEmptyComponent={
                            <EmptyState
                                icon={<Icon name="user" size={40} color={colors.textTertiary} />}
                                title="No followed authors yet"
                                body="Follow an author from their page and they will show up here, with a switch for their notifications."
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

export default AuthorNotificationsScreen;
