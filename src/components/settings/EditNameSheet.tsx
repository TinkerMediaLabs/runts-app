import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { updateUserAttribute } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import Sheet from '@/components/common/BottomSheet';
import Button from '@/components/common/Button';
import { useApp } from '@/context/AppContext';
import { unwrap } from '@/lib/amplifyResult';
import { showChip } from '@/lib/chip';
import { fields } from '@/theme/fields';
import { colors } from '@/theme/colors';
import { fontSizes, radius, iconSize } from '@/theme/tokens';

const client = generateClient<Schema>();

// The "Update Display Name" drawer. Used from the Account screen and by tapping the name on the Profile screen, so
// the name is saved the same way (sign-in profile and the User table) wherever it is changed.
export default function EditNameSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { userId, profile, setProfile } = useApp();
    const [name, setName]     = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    // Start from the current name each time the drawer opens.
    useEffect(() => {
        if (!visible) return;
        const current = profile?.name && profile.name !== 'user' ? profile.name : '';
        setName(current);
        setError('');
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        const next = name.trim();
        if (!next) return;
        setSaving(true);
        setError('');
        try {
            await updateUserAttribute({ userAttribute: { attributeKey: 'name', value: next } });
            if (userId) {
                unwrap(await client.models.User.update({ id: userId, name: next }), 'Update name');
            }
            setProfile(profile ? { ...profile, name: next } : null);
            showChip('Display name updated');
            onClose();
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Error updating name. Please try again.');
        }
        setSaving(false);
    };

    return (
        <Sheet visible={visible} onClose={onClose} title="Update Display Name">
            {error ? (
                <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                    <FontAwesome5 name="exclamation-triangle" size={iconSize.sm} color="#ff4444bf" iconStyle="solid" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
            <Text style={styles.label}>New name</Text>
            <TextInput
                style={[styles.input, { marginBottom: 24, color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Your display name"
                accessibilityLabel="New display name"
                placeholderTextColor={colors.textSecondary}
                maxLength={30}
                autoCapitalize="words"
            />
            <Button
                label="Save Name"
                onPress={save}
                loading={saving}
                disabled={name.trim().length === 0}
                variant="primary"
                style={{ marginTop: 4 }}
            />
        </Sheet>
    );
}

const styles = StyleSheet.create({
    label: {
        fontSize: fontSizes.caption,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    input: {
        ...fields.box,
        ...fields.text,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#2d1111',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: '#ff444440',
        padding: 12,
        marginBottom: 24,
        gap: 10,
    },
    errorText: {
        flex: 1,
        fontSize: fontSizes.small,
        color: '#ff8888',
        lineHeight: 19,
    },
});
