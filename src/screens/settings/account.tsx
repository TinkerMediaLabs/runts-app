import React, { useState, useRef } from 'react';
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
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MenuHeader from '../../components/common/MenuHeader';
import Screen from '../../components/common/Screen';

import { useApp } from '@/context/AppContext';
import { spacing } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Reusable row for account settings
const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    destructive = false,
    chevron = true,
}: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    destructive?: boolean;
    chevron?: boolean;
}) => (
    <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.row}
        disabled={!onPress}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
                <FontAwesome5
                    name={icon}
                    size={14}
                    color={destructive ? '#ff4444bf' : '#ffffffa5'}
                    iconStyle="solid"
                />
            </View>
            <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
                {label}
            </Text>
        </View>
        <View style={styles.rowRight}>
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

// Section wrapper
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCard}>{children}</View>
    </View>
);

// Divider between rows
const RowDivider = () => <View style={styles.divider} />;

// Bottom sheet modal wrapper — shared by all modal types
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
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.sheetBackdrop} />
            </TouchableWithoutFeedback>

            {/* Sheet */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.sheetWrapper}
                pointerEvents="box-none"
            >
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Handle */}
                    <View style={styles.sheetHandle} />

                    {/* Header */}
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

// Password input row with show/hide toggle
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
                    style={styles.input}
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

// Primary action button
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

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const AccountScreen = ({ navigation }: any) => {

    const { userId, isAuthenticated, logout } = useApp();

    // ── Modal state — single source of truth ──────────────────────────────────
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const open  = (modal: ModalType) => setActiveModal(modal);
    const close = () => setActiveModal(null);

    // ── Form state ────────────────────────────────────────────────────────────
    const [name, setName]               = useState('');
    const [email, setEmail]             = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');

    // ── Loading ───────────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);

    // ── Placeholder handlers — wire to your API ───────────────────────────────
    const handleUpdateName = async () => {
        setIsLoading(true);
        // TODO: await yourApi.updateName(name);
        setIsLoading(false);
        close();
    };

    const handleUpdateEmail = async () => {
        setIsLoading(true);
        // TODO: await yourApi.updateEmail(email);
        setIsLoading(false);
        close();
    };

    const handleUpdatePassword = async () => {
        setIsLoading(true);
        // TODO: await yourApi.changePassword(oldPassword, newPassword);
        setIsLoading(false);
        close();
    };

    const handleSignOut = async () => {
        setIsLoading(true);
        // TODO: await yourApi.signOut();
        logout();
        setIsLoading(false);
        close();
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirm.toLowerCase() !== 'delete') return;
        setIsLoading(true);
        // TODO: await yourApi.deleteAccount();
        setIsLoading(false);
        close();
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
                            value="Free"
                            onPress={() => {/* TODO: navigate to upgrade */}}
                        />
                        <RowDivider />
                        <SettingRow
                            icon="user"
                            label="Display Name"
                            value="Not set"
                            onPress={() => open('name')}
                        />
                        <RowDivider />
                        <SettingRow
                            icon="envelope"
                            label="Email"
                            value="Not set"
                            onPress={() => open('email')}
                        />
                    </Section>

                    {/* ── Security ── */}
                    <Section title="Security">
                        <SettingRow
                            icon="lock"
                            label="Change Password"
                            onPress={() => open('password')}
                        />
                    </Section>

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

                    {/* App version */}
                    <Text style={styles.version}>Version 1.0.0</Text>

                </ScrollView>
            </LinearGradient>

            {/* ── Update Name sheet ── */}
            <Sheet visible={activeModal === 'name'} onClose={close} title="Update Display Name">
                <Text style={styles.fieldLabel}>New name</Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24 }]}
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

            {/* ── Update Email sheet ── */}
            <Sheet visible={activeModal === 'email'} onClose={close} title="Update Email">
                <Text style={styles.sheetNote}>
                    A verification code will be sent to your new address.
                </Text>
                <Text style={styles.fieldLabel}>New email</Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24 }]}
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
            </Sheet>

            {/* ── Change Password sheet ── */}
            <Sheet visible={activeModal === 'password'} onClose={close} title="Change Password">
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
                <ActionButton
                    label="Update Password"
                    onPress={handleUpdatePassword}
                    loading={isLoading}
                    disabled={oldPassword.length < 6 || newPassword.length < 6}
                />
            </Sheet>

            {/* ── Sign Out sheet ── */}
            <Sheet visible={activeModal === 'signout'} onClose={close} title="Sign Out">
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
                <Text style={styles.fieldLabel}>
                    Type <Text style={{ color: '#ff4444bf' }}>delete</Text> to confirm
                </Text>
                <TextInput
                    style={[styles.input, { marginBottom: 24, borderColor: deleteConfirm.toLowerCase() === 'delete' ? '#ff4444' : '#333' }]}
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
        backgroundColor: '#2d1111',
    },
    rowLabel: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
    },
    rowLabelDestructive: {
        color: '#ff4444bf',
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
        flex: 1,
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

    // ── Danger banner ─────────────────────────────────────────────────────────
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

    // ── Footer ────────────────────────────────────────────────────────────────
    version: {
        textAlign: 'center',
        color: '#ffffff25',
        fontSize: 12,
        marginTop: 40,
    },
});

export default AccountScreen;