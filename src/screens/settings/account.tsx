import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Modal,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MenuHeader from '../../components/common/MenuHeader';
import Screen from '../../components/common/Screen';

import { useApp } from '@/context/AppContext';
import { spacing } from '../../theme/spacing';

import {
    updateUserAttribute,
    confirmUserAttribute,
    updatePassword,
    deleteUser,
    fetchAuthSession,
} from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();
const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Config — update this URL after deploying API Gateway
// ---------------------------------------------------------------------------
const DELETE_USER_API_URL = 'https://691umui6i9.execute-api.us-east-2.amazonaws.com/prod/delete-user';

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
                        size={14}
                        color={'#ffffffa5'}
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
                    size={11}
                    color="#ffffff40"
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
            <TouchableWithoutFeedback onPress={onClose}>
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
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <FontAwesome5 name="times" size={16} color="#ffffffa5" iconStyle="solid" />
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
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        fontSize: 15,
                        color: '#fff',
                    }}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder ?? ''}
                    placeholderTextColor="#ffffff40"
                    secureTextEntry={hidden}
                    maxLength={32}
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.inputEye}>
                    <FontAwesome5
                        name={hidden ? 'eye-slash' : 'eye'}
                        size={14}
                        color="#ffffffa5"
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
    <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
            styles.actionButton,
            destructive && styles.actionButtonDestructive,
            (disabled || loading) && styles.actionButtonDisabled,
        ]}
    >
        {loading ? (
            <ActivityIndicator size="small" color={destructive ? '#fff' : '#000'} />
        ) : (
            <Text style={[styles.actionButtonText, destructive && styles.actionButtonTextDestructive]}>
                {label}
            </Text>
        )}
    </TouchableOpacity>
);

const SuccessBanner = ({ message }: { message: string }) => (
    <View style={styles.successBanner}>
        <FontAwesome5 name="check-circle" size={14} color="#00ffff" iconStyle="solid" />
        <Text style={styles.successBannerText}>{message}</Text>
    </View>
);

const ErrorBanner = ({ message }: { message: string }) => (
    <View style={styles.dangerBanner}>
        <FontAwesome5 name="exclamation-triangle" size={14} color="#ff4444bf" iconStyle="solid" />
        <Text style={styles.dangerBannerText}>{message}</Text>
    </View>
);

const InfoBanner = ({ message }: { message: string }) => (
    <View style={styles.infoBanner}>
        <FontAwesome5 name="info-circle" size={14} color="#ffffff88" iconStyle="solid" />
        <Text style={styles.infoBannerText}>{message}</Text>
    </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const AccountScreen = ({ navigation }: any) => {

    const { userId, logout, profile } = useApp();

    // ── Auth provider detection ───────────────────────────────────────────────
    const [authProvider, setAuthProvider] = useState<AuthProvider>('unknown');
    const [cognitoUsername, setCognitoUsername] = useState<string | null>(null);
    const [userPoolId, setUserPoolId] = useState<string | null>(null);

    useEffect(() => {
        async function detectProvider() {
            try {
                const session = await fetchAuthSession();
                const idToken = session.tokens?.idToken;
                if (!idToken) return;

                const payload = idToken.payload as any;
                const identities = payload?.identities;

                // Get cognito username for admin delete
                setCognitoUsername(payload?.['cognito:username'] ?? null);

                // Get user pool ID from the token's issuer URL
                // Format: https://cognito-idp.us-east-2.amazonaws.com/us-east-2_XXXXXXX
                const iss = payload?.iss as string;
                if (iss) {
                    const parts = iss.split('/');
                    const poolId = parts[parts.length - 1];
                    setUserPoolId(poolId ?? null);
                    console.log('parsed userPoolId:', poolId);
                }

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
            await updateUserAttribute({
                userAttribute: {
                    attributeKey: 'name',
                    value: name.trim(),
                },
            });
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
    // const handleDeleteAccount = async () => {
    //     if (deleteConfirm.toLowerCase() !== 'delete') return;
    //     setIsLoading(true);
    //     setError('');
    //     try {
    //         // 1. Delete DynamoDB record first
    //         if (userId) {
    //             await client.models.User.delete({ id: userId });
    //         }

    //         if (isSocialUser) {
    //             // 2a. For social users use Admin API via Lambda
    //             // since deleteUser() requires aws.cognito.signin.user.admin scope
    //             // which federated tokens don't include
    //             if (!cognitoUsername || !userPoolId) {
    //                 throw new Error('Unable to identify user for deletion.');
    //             }

    //             const response = await fetch(DELETE_USER_API_URL, {
    //                 method: 'POST',
    //                 headers: { 'Content-Type': 'application/json' },
    //                 body: JSON.stringify({
    //                     userPoolId,
    //                     username: cognitoUsername,
    //                 }),
    //             });

    //             const result = await response.json();

    //             if (!response.ok || result.error) {
    //                 throw new Error(result.error || 'Failed to delete account.');
    //             }

    //             // Sign out after successful deletion
    //             await logout();
    //         } else {
    //             // 2b. For email users use standard Amplify deleteUser
    //             await deleteUser();
    //             await logout();
    //         }

    //         close();
    //     } catch (err: any) {
    //         console.log(err);
    //         setError(err?.message || 'Error deleting account. Please try again.');
    //     }
    //     setIsLoading(false);
    // };

    const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') return;
    setIsLoading(true);
    setError('');
    try {
        if (userId) {
            await client.models.User.delete({ id: userId });
        }

        if (isSocialUser) {
            if (!cognitoUsername || !userPoolId) {
                throw new Error('Unable to identify user for deletion.');
            }

            console.log('Calling delete API with:', { userPoolId, username: cognitoUsername });

            const response = await fetch(DELETE_USER_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userPoolId,
                    username: cognitoUsername,
                }),
            });

            const rawText = await response.text();
            console.log('API response status:', response.status);
            console.log('API response raw:', rawText);

            const result = JSON.parse(rawText);
            console.log('API result:', JSON.stringify(result));

            // API Gateway wraps Lambda response in another layer
            const innerBody = typeof result.body === 'string' 
                ? JSON.parse(result.body) 
                : result.body;

            console.log('Inner body:', JSON.stringify(innerBody));

            if (result.statusCode >= 400 || innerBody?.error) {
                throw new Error(innerBody?.error || 'Failed to delete account.');
            }

            await logout();
        } else {
            await deleteUser();
            await logout();
        }

        close();
    } catch (err: any) {
        console.log('Delete error:', err);
        setError(err?.message || 'Error deleting account. Please try again.');
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
                            value={profile?.plan ?? 'Free'}
                            onPress={() => {/* TODO: navigate to upgrade */}}
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

                    <Text style={styles.version}>Version 1.0.0</Text>
                </ScrollView>
            </LinearGradient>

            {/* ── Update Name sheet ── */}
            <Sheet visible={activeModal === 'name'} onClose={close} title="Update Display Name">
                {error ? <ErrorBanner message={error} /> : null}
                {success ? <SuccessBanner message={success} /> : null}
                <Text style={styles.fieldLabel}>New name</Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24, color: '#fff' }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your display name"
                    placeholderTextColor="#ffffff40"
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
                            style={[styles.input, { marginBottom: 24, color: '#fff' }]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="new@email.com"
                            placeholderTextColor="#ffffff40"
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
                            <Text style={{ color: '#00ffff' }}>{email}</Text>
                        </Text>
                        <Text style={styles.fieldLabel}>Verification code</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 24, color: '#fff' }]}
                            value={emailCode}
                            onChangeText={setEmailCode}
                            placeholder="000000"
                            placeholderTextColor="#ffffff40"
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
                        <TouchableOpacity
                            onPress={() => {
                                setEmailStep('input');
                                setEmailCode('');
                                setError('');
                                setSuccess('');
                            }}
                            style={styles.cancelButton}
                        >
                            <Text style={styles.cancelText}>← Back</Text>
                        </TouchableOpacity>
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
                <TouchableOpacity onPress={close} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </Sheet>

            {/* ── Delete Account sheet ── */}
            <Sheet visible={activeModal === 'delete'} onClose={close} title="Delete Account">
                <View style={styles.dangerBanner}>
                    <FontAwesome5 name="exclamation-triangle" size={14} color="#ff4444bf" iconStyle="solid" />
                    <Text style={styles.dangerBannerText}>
                        This action is permanent and cannot be undone. All account data will be removed.
                    </Text>
                </View>
                {isSocialUser && (
                    <InfoBanner message={`Your ${providerLabel} account will be disconnected from Runts but not deleted.`} />
                )}
                {error ? <ErrorBanner message={error} /> : null}
                <Text style={styles.fieldLabel}>
                    Type <Text style={{ color: '#ff4444bf' }}>delete</Text> to confirm
                </Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24, color: '#fff', borderColor: deleteConfirm.toLowerCase() === 'delete' ? '#ff4444' : '#333' }]}
                    value={deleteConfirm}
                    onChangeText={setDeleteConfirm}
                    placeholder="delete"
                    placeholderTextColor="#ffffff20"
                    autoCapitalize="none"
                />
                <ActionButton
                    label="Permanently Delete Account"
                    onPress={handleDeleteAccount}
                    loading={isLoading}
                    destructive
                    disabled={deleteConfirm.toLowerCase() !== 'delete'}
                />
                <TouchableOpacity onPress={close} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
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
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#ffffff50',
        marginBottom: 10,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
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
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowIconDestructive: {
        backgroundColor: '#2a2a2a',
    },
    rowLabel: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
    },
    rowLabelDestructive: {
        color: '#ffffffa5',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: width * 0.4,
    },
    rowValue: {
        fontSize: 14,
        color: '#ffffff50',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
        marginLeft: 58,
    },

    // ── Badge ─────────────────────────────────────────────────────────────────
    badge: {
        backgroundColor: '#00ffff18',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#00ffff40',
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        color: '#00ffff',
        fontSize: 11,
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
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: '#2a2a2a',
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
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    sheetNote: {
        fontSize: 13,
        color: '#ffffff70',
        lineHeight: 20,
        marginBottom: 20,
    },

    // ── Form fields ───────────────────────────────────────────────────────────
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff70',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    input: {
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#fff',
    },
    inputEye: {
        paddingHorizontal: 14,
    },

    // ── Buttons ───────────────────────────────────────────────────────────────
    actionButton: {
        backgroundColor: 'cyan',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    actionButtonDestructive: {
        backgroundColor: '#cc2222',
    },
    actionButtonDisabled: {
        opacity: 0.4,
    },
    actionButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '700',
    },
    actionButtonTextDestructive: {
        color: '#fff',
    },
    cancelButton: {
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelText: {
        color: '#ffffff60',
        fontSize: 14,
    },

    // ── Notices ───────────────────────────────────────────────────────────────
    dangerBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#2d1111',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ff444440',
        padding: 12,
        marginBottom: 24,
        gap: 10,
    },
    dangerBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#ff8888',
        lineHeight: 19,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#00ffff12',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#00ffff40',
        padding: 12,
        marginBottom: 24,
        gap: 10,
    },
    successBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#00ffff',
        lineHeight: 19,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ffffff08',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffffff20',
        padding: 12,
        marginBottom: 24,
        gap: 10,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#ffffff70',
        lineHeight: 19,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    version: {
        textAlign: 'center',
        color: '#ffffff25',
        fontSize: 12,
        marginTop: 40,
    },
});

export default AccountScreen;