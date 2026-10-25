import React from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from '@/components/common/Screen';
import MenuHeader from '../../components/common/MenuHeader';
import EmptyState from '../../components/common/EmptyState';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { showChip } from '@/lib/chip';
import { useBlockedUsers, useUnblockUser } from '../../hooks/queries/useModeration';

// People whose comments this listener has hidden, with a way to undo it.
const BlockedUsersScreen = ({ navigation }: any) => {
    const { data: blocked = [], isLoading } = useBlockedUsers();
    const { mutate: unblock } = useUnblockUser();

    return (
        <Screen>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <MenuHeader title="Blocked commenters" navigation={navigation} />
                {isLoading ? (
                    <View style={styles.center}><ActivityIndicator color="cyan" /></View>
                ) : (
                    <FlatList
                        data={blocked}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        renderItem={({ item }: any) => (
                            <View style={styles.row}>
                                <Text style={styles.name} numberOfLines={1}>{item.blockedUserName || 'Listener'}</Text>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => unblock(item.id, { onSuccess: () => showChip('Unblocked', 'success') })}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Unblock ${item.blockedUserName || 'this listener'}`}
                                >
                                    <Text style={styles.buttonText}>Unblock</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <EmptyState
                                icon={<FontAwesome5 name="user-slash" size={40} color="#ffffff40" iconStyle="solid" />}
                                title="No one is blocked"
                                body="If someone's comments bother you, tap the three dots on a comment and choose Block. Their comments will be hidden from you."
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
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14, minHeight: 56,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)',
    },
    name: { color: '#fff', fontSize: 16, flex: 1, marginRight: 12 },
    button: {
        minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center',
        borderWidth: 1, borderColor: 'cyan',
    },
    buttonText: { color: 'cyan', fontSize: 14, fontWeight: '600' },
});

export default BlockedUsersScreen;
