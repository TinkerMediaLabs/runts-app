import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, TouchableWithoutFeedback, ScrollView, Modal, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';

import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import MenuHeader from '../../components/common/MenuHeader';
import Screen from '../../components/common/Screen';
import { colors } from '../../theme/colors';
import { fields } from '../../theme/fields';
import Button from '../../components/common/Button';

import { useApp } from '@/context/AppContext';
import { spacing } from '../../theme/spacing';

import {
    updateUserAttribute,
    confirmUserAttribute,
    updatePassword,
    fetchAuthSession,
} from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { unwrap } from '@/lib/amplifyResult';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

const client = generateClient<Schema>();
const { width } = Dimensions.get('window');



// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalType =
    | 'name'
    | 'email'
    | 'password'
    | 'signout'
    | 'delete'
    | null;

type AuthProvider = 'email' | 'google' | 'apple' | 'unknown';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    destructive = false,
    chevron = true,
    badge,
}: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    destructive?: boolean;
    chevron?: boolean;
    badge?: string;
}) => (
    <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.row}
        disabled={!onPress}
        accessible
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={value ? `${label}, ${value}` : badge ? `${label}, ${badge}` : label}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
                {icon === 'google' ? (
                    <Image
                        source={require('../../../assets/images/google-logo.png')}
                        style={{ width: 28, height: 28 }}
                    />
                ) : icon === 'apple' ? (
                    <Image
                        source={require('../../../assets/images/apple-logo.png')}
                        style={{ width: 28, height: 28 }}
                    />
                ) : (
                    <FontAwesome5
                        name={icon}
                        size={iconSize.sm}
                        color={colors.textSecondary}
                        iconStyle="solid"
                    />
                )}
            </View>
            <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
                {label}
            </Text>
        </View>
        <View style={styles.rowRight}>
            {badge ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            ) : null}
            {value ? (
                <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
            ) : null}
            {chevron && onPress && (
                <FontAwesome5
                    name="chevron-right"
                    size={iconSize.xs}
                    color={colors.textSecondary}
                    iconStyle="solid"
                />
            )}
        </View>
    </TouchableOpacity>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCard}>{children}</View>
    </View>
);

const RowDivider = () => <View style={styles.divider} />;

const Sheet = ({
    visible,
    onClose,
    title,
    children,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}) => {
    const insets = useSafeAreaInsets();
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                <View style={styles.sheetBackdrop} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.sheetWrapper}
                pointerEvents="box-none"
            >
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityRole="button" accessibilityLabel={`Close ${title}`}>
                            <FontAwesome5 name="times" size={iconSize.sm} color={colors.textSecondary} iconStyle="solid" />
                        </TouchableOpacity>
                    </View>
                    {children}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const PasswordField = ({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) => {
    const [hidden, setHidden] = useState(true);
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.inputRow}>
                <TextInput
                    style={{
                        flex: 1,
                        paddingHorizontal: 16,
                        ...fields.text,
                    }}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder ?? ''}
                    accessibilityLabel={label}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={hidden}
                    maxLength={32}
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.inputEye} accessibilityRole="button" accessibilityLabel={hidden ? `Show ${label}` : `Hide ${label}`} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                    <FontAwesome5
                        name={hidden ? 'eye-slash' : 'eye'}
                        size={iconSize.sm}
                        color={colors.textSecondary}
                        iconStyle="solid"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ActionButton = ({
    label,
    onPress,
    loading = false,
    destructive = false,
    disabled = false,
}: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    destructive?: boolean;
    disabled?: boolean;
}) => (
    <Button
        label={label}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
        variant={destructive ? 'danger' : 'primary'}
        style={{ marginTop: 4 }}
    />
);

const SuccessBanner = ({ message }: { message: string }) => (
    <View style={styles.successBanner} accessibilityLiveRegion="polite">
        <FontAwesome5 name="check-circle" size={iconSize.sm} color={colors.accent} iconStyle="solid" />
        <Text style={styles.successBannerText}>{message}</Text>
    </View>
);

const ErrorBanner = ({ message }: { message: string }) => (
    <View style={styles.dangerBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <FontAwesome5 name="exclamation-triangle" size={iconSize.sm} color="#ff4444bf" iconStyle="solid" />
        <Text style={styles.dangerBannerText}>{message}</Text>
    </View>
);

const InfoBanner = ({ message }: { message: string }) => (
    <View style={styles.infoBanner}>
        <FontAwesome5 name="info-circle" size={iconSize.sm} color={colors.textSecondary} iconStyle="solid" />
        <Text style={styles.infoBannerText}>{message}</Text>
    </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const AccountScreen = ({ navigation }: any) => {

    const { userId, logout, profile, setProfile, isPremium } = useApp();

    // ── Auth provider detection ───────────────────────────────────────────────
    const [authProvider, setAuthProvider] = useState<AuthProvider>('unknown');

    useEffect(() => {
        async function detectProvider() {
            try {
                const session = await fetchAuthSession();
                const idToken = session.tokens?.idToken;
                if (!idToken) return;

                const payload = idToken.payload as any;
                const identities = payload?.identities;

                if (identities && Array.isArray(identities) && identities.length > 0) {
                    const providerType = identities[0].providerType?.toLowerCase();
                    if (providerType === 'google') {
                        setAuthProvider('google');
                    } else if (providerType === 'signinwithapple') {
                        setAuthProvider('apple');
                    } else {
                        setAuthProvider('email');
                    }
                } else {
                    setAuthProvider('email');
                }
            } catch (err) {
                console.log('Provider detection error:', err);
                setAuthProvider('email');
            }
        }
        detectProvider();
    }, []);

    const isSocialUser = authProvider === 'google' || authProvider === 'apple';
    const providerLabel = authProvider === 'google' ? 'Google' : authProvider === 'apple' ? 'Apple' : null;

    // ── Modal state ───────────────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const open  = (modal: ModalType) => setActiveModal(modal);
    const close = () => {
        setActiveModal(null);
        setName('');
        setEmail('');
        setEmailCode('');
        setEmailStep('input');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setDeleteConfirm('');
        setError('');
        setSuccess('');
    };

    // ── Form state ────────────────────────────────────────────────────────────
    const [name, setName]                       = useState('');
    const [email, setEmail]                     = useState('');
    const [emailCode, setEmailCode]             = useState('');
    const [emailStep, setEmailStep]             = useState<'input' | 'verify'>('input');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPassword, setOldPassword]         = useState('');
    const [deleteConfirm, setDeleteConfirm]     = useState('');

    // ── Loading / feedback ────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState('');
    const [success, setSuccess]     = useState('');

    // ── Update Display Name ───────────────────────────────────────────────────
    const handleUpdateName = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            // Update Cognito attribute
            await updateUserAttribute({
                userAttribute: {
                    attributeKey: 'name',
                    value: name.trim(),
                },
            });

            // Also update DynamoDB
            if (userId) {
                unwrap(await client.models.User.update({
                    id: userId,
                    name: name.trim(),
                }), 'Update name');
            }

            // Update local AppContext state
            setProfile(profile ? { ...profile, name: name.trim() } : null);

            setSuccess('Your display name has been updated.');
            setName('');
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Error updating name. Please try again.');
        }
        setIsLoading(false);
    };

    // ── Update Email — step 1: send code ─────────────────────────────────────
    const handleUpdateEmail = async () => {
        if (!email.trim()) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await updateUserAttribute({
                userAttribute: {
                    attributeKey: 'email',
                    value: email.replace(/ /g, ''),
                },
            });
            setEmailStep('verify');
            setSuccess('A verification code has been sent to your new email address.');
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Error updating email. Please try again.');
        }
        setIsLoading(false);
    };

    // ── Update Email — step 2: confirm code ──────────────────────────────────
    const handleConfirmEmailCode = async () => {
        if (!emailCode.trim()) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await confirmUserAttribute({
                userAttributeKey: 'email',
                confirmationCode: emailCode.trim(),
            });
            setSuccess('Your email has been updated successfully.');
            setTimeout(() => close(), 1500);
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Invalid code. Please try again.');
        }
        setIsLoading(false);
    };

    // ── Change Password ───────────────────────────────────────────────────────
    const handleUpdatePassword = async () => {
        if (oldPassword.length < 6 || newPassword.length < 6) return;
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await updatePassword({ oldPassword, newPassword });
            setSuccess('Your password has been changed successfully.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Error updating password. Please try again.');
        }
        setIsLoading(false);
    };

    // ── Sign Out ──────────────────────────────────────────────────────────────
    const handleSignOut = async () => {
        setIsLoading(true);
        setError('');
        try {
            await logout();
            close();
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Error signing out. Please try again.');
        }
        setIsLoading(false);
    };

    // ── Delete Account ────────────────────────────────────────────────────────
    // One server call removes the profile data, then the sign-in account (see amplify/functions/delete-account).
    // If it fails, the account still exists and the user can simply try again.
    const handleDeleteAccount = async () => {
        if (deleteConfirm.toLowerCase() !== 'delete') return;
        setIsLoading(true);
        setError('');
        try {
            if (unwrap(await client.mutations.deleteMyAccount(), 'Delete account') !== true) throw new Error('Delete account failed');
            await logout();
            close();
        } catch (err: any) {
            console.warn('Delete account failed:', err);
            setError('We could not delete your account. Please check your connection and try again.');
        }
        setIsLoading(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Screen>
            <LinearGradient
                colors={['#000', '#12121a', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <MenuHeader title="Account" navigation={navigation} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Account info ── */}
                    <Section title="Account">
                        <SettingRow
                            icon="crown"
                            label="Plan"
                            value={isPremium ? 'Premium' : 'Free'}
                            badge={isPremium ? 'Active' : undefined}
                            onPress={() => {
                                if (isPremium) {
                                    // Open OS subscription management
                                    const url = Platform.OS === 'ios'
                                        ? 'https://apps.apple.com/account/subscriptions'
                                        : 'https://play.google.com/store/account/subscriptions';
                                    Linking.openURL(url);
                                } else {
                                    navigation.navigate('Premium' as any);
                                }
                            }}
                        />
                        <RowDivider />
                        <SettingRow
                            icon="user"
                            label="Display Name"
                            value={profile?.name ?? 'Not set'}
                            onPress={() => open('name')}
                        />
                        <RowDivider />
                        <SettingRow
                            icon="envelope"
                            label="Email"
                            badge={providerLabel ?? undefined}
                            onPress={isSocialUser ? undefined : () => open('email')}
                            chevron={!isSocialUser}
                        />
                    </Section>

                    {/* ── Security — only for email users ── */}
                    {!isSocialUser && (
                        <Section title="Security">
                            <SettingRow
                                icon="lock"
                                label="Change Password"
                                onPress={() => open('password')}
                            />
                        </Section>
                    )}

                    {/* ── Connected account — only for social users ── */}
                    {isSocialUser && (
                        <Section title="Connected Account">
                            <SettingRow
                                icon={authProvider === 'google' ? 'google' : 'apple'}
                                label={`Signed in with ${providerLabel}`}
                                chevron={false}
                            />
                        </Section>
                    )}

                    {/* ── Session ── */}
                    <Section title="Session">
                        <SettingRow
                            icon="sign-out-alt"
                            label="Sign Out"
                            onPress={() => open('signout')}
                        />
                    </Section>

                    {/* ── Danger zone ── */}
                    <Section title="Danger Zone">
                        <SettingRow
                            icon="trash"
                            label="Delete Account"
                            onPress={() => open('delete')}
                            destructive
                        />
                    </Section>

                    <Text style={styles.version}>
                        Version {Constants.expoConfig?.version ?? '1.0.0'}
                    </Text>
                </ScrollView>
            </LinearGradient>

            {/* ── Update Name sheet ── */}
            <Sheet visible={activeModal === 'name'} onClose={close} title="Update Display Name">
                {error ? <ErrorBanner message={error} /> : null}
                {success ? <SuccessBanner message={success} /> : null}
                <Text style={styles.fieldLabel}>New name</Text>
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
                <ActionButton
                    label="Save Name"
                    onPress={handleUpdateName}
                    loading={isLoading}
                    disabled={name.trim().length === 0}
                />
            </Sheet>

            {/* ── Update Email sheet — email users only ── */}
            <Sheet
                visible={activeModal === 'email'}
                onClose={close}
                title={emailStep === 'input' ? 'Update Email' : 'Verify New Email'}
            >
                {error ? <ErrorBanner message={error} /> : null}
                {success ? <SuccessBanner message={success} /> : null}

                {emailStep === 'input' ? (
                    <>
                        <Text style={styles.sheetNote}>
                            A verification code will be sent to your new address.
                        </Text>
                        <Text style={styles.fieldLabel}>New email</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 24, color: colors.textPrimary }]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="new@email.com"
                            accessibilityLabel="New email address"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={60}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <ActionButton
                            label="Send Verification Code"
                            onPress={handleUpdateEmail}
                            loading={isLoading}
                            disabled={email.trim().length === 0}
                        />
                    </>
                ) : (
                    <>
                        <Text style={styles.sheetNote}>
                            Enter the verification code sent to{' '}
                            <Text style={{ color: colors.accent }}>{email}</Text>
                        </Text>
                        <Text style={styles.fieldLabel}>Verification code</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 24, color: colors.textPrimary }]}
                            value={emailCode}
                            onChangeText={setEmailCode}
                            placeholder="000000"
                            accessibilityLabel="Verification code"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={6}
                            keyboardType="number-pad"
                            autoCapitalize="none"
                        />
                        <ActionButton
                            label="Confirm Email Change"
                            onPress={handleConfirmEmailCode}
                            loading={isLoading}
                            disabled={emailCode.trim().length === 0}
                        />
                        <Button
                            label="← Back"
                            variant="text"
                            accessibilityLabel="Back"
                            style={{ marginTop: 8 }}
                            onPress={() => {
                                setEmailStep('input');
                                setEmailCode('');
                                setError('');
                                setSuccess('');
                            }}
                        />
                    </>
                )}
            </Sheet>

            {/* ── Change Password sheet — email users only ── */}
            <Sheet visible={activeModal === 'password'} onClose={close} title="Change Password">
                {error ? <ErrorBanner message={error} /> : null}
                {success ? <SuccessBanner message={success} /> : null}
                <PasswordField
                    label="Current password"
                    value={oldPassword}
                    onChange={setOldPassword}
                    placeholder="••••••••"
                />
                <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="••••••••"
                />
                <PasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                />
                <ActionButton
                    label="Update Password"
                    onPress={handleUpdatePassword}
                    loading={isLoading}
                    disabled={oldPassword.length < 6 || newPassword.length < 6 || confirmPassword.length < 6}
                />
            </Sheet>

            {/* ── Sign Out sheet ── */}
            <Sheet visible={activeModal === 'signout'} onClose={close} title="Sign Out">
                {error ? <ErrorBanner message={error} /> : null}
                <Text style={styles.sheetNote}>
                    You'll need to sign back in to access your account.
                </Text>
                <ActionButton
                    label="Sign Out"
                    onPress={handleSignOut}
                    loading={isLoading}
                />
                <Button label="Cancel" variant="text" onPress={close} style={{ marginTop: 8 }} />
            </Sheet>

            {/* ── Delete Account sheet ── */}
            <Sheet visible={activeModal === 'delete'} onClose={close} title="Delete Account">
                <View style={styles.dangerBanner}>
                    <FontAwesome5 name="exclamation-triangle" size={iconSize.sm} color="#ff4444bf" iconStyle="solid" />
                    <Text style={styles.dangerBannerText}>
                        This action is permanent and cannot be undone. All account data will be removed.
                    </Text>
                </View>
                {isSocialUser && (
                    <InfoBanner message={`Your ${providerLabel} account itself is not deleted, only your Runts account.`} />
                )}
                {authProvider === 'apple' && (
                    <InfoBanner message="To also remove Runts from your Apple ID, open Settings, tap your name, then Sign in with Apple, choose Runts and tap Stop Using Apple ID." />
                )}
                {error ? <ErrorBanner message={error} /> : null}
                <Text style={styles.fieldLabel}>
                    Type <Text style={{ color: '#ff4444bf' }}>delete</Text> to confirm
                </Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24, color: colors.textPrimary, borderColor: deleteConfirm.toLowerCase() === 'delete' ? '#ff4444' : colors.border }]}
                    value={deleteConfirm}
                    onChangeText={setDeleteConfirm}
                    placeholder="delete"
                    accessibilityLabel="Type delete to confirm"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                />
                <ActionButton
                    label="Permanently Delete Account"
                    onPress={handleDeleteAccount}
                    loading={isLoading}
                    destructive
                    disabled={deleteConfirm.toLowerCase() !== 'delete'}
                />
                <Button label="Cancel" variant="text" onPress={close} style={{ marginTop: 8 }} />
            </Sheet>

        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    scrollContent: {
        paddingBottom: 60,
    },

    // ── Sections ──────────────────────────────────────────────────────────────
    section: {
        marginTop: 28,
        paddingHorizontal: spacing.margin,
    },
    sectionTitle: {
        fontSize: fontSizes.caption,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: 10,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },

    // ── Rows ─────────────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowIcon: {
        width: 30,
        height: 30,
        borderRadius: radius.sm,
        backgroundColor: colors.surface3,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowIconDestructive: {
        backgroundColor: colors.surface3,
    },
    rowLabel: {
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    rowLabelDestructive: {
        color: colors.textSecondary,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: width * 0.4,
    },
    rowValue: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
        marginLeft: 58,
    },

    // ── Badge ─────────────────────────────────────────────────────────────────
    badge: {
        backgroundColor: '#00ffff18',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.accentFaint,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        color: colors.accent,
        fontSize: fontSizes.caption,
        fontWeight: '600',
    },

    // ── Bottom sheet ──────────────────────────────────────────────────────────
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheetWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: colors.border,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ffffff30',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sheetTitle: {
        fontSize: fontSizes.subtitle,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    sheetNote: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
    },

    // ── Form fields ───────────────────────────────────────────────────────────
    fieldLabel: {
        fontSize: fontSizes.caption,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    inputRow: {
        ...fields.box,
        paddingHorizontal: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        ...fields.box,
        ...fields.text,
    },
    inputEye: {
        paddingHorizontal: 14,
    },

    // ── Buttons ───────────────────────────────────────────────────────────────

    // ── Notices ───────────────────────────────────────────────────────────────
    dangerBanner: {
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
    dangerBannerText: {
        flex: 1,
        fontSize: fontSizes.small,
        color: '#ff8888',
        lineHeight: 19,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#00ffff12',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.accentFaint,
        padding: 12,
        marginBottom: 24,
        gap: 10,
    },
    successBannerText: {
        flex: 1,
        fontSize: fontSizes.small,
        color: colors.accent,
        lineHeight: 19,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ffffff08',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: '#ffffff20',
        padding: 12,
        marginBottom: 24,
        gap: 10,
    },
    infoBannerText: {
        flex: 1,
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        lineHeight: 19,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    version: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: fontSizes.caption,
        marginTop: 40,
    },
});

export default AccountScreen;