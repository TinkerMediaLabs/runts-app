import React from 'react';
import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Screen from '@/components/common/Screen';
import useStyles from '@/theme/styles';
import { useApp } from '@/context/AppContext';
import {
    updateUserAttribute,
    updatePassword,
    deleteUser,
} from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';



const client = generateClient<Schema>();

// const AccountScreen = ({ navigation }: any) => {
//     const styles = useStyles();
//     const { profile, logout, userId } = useApp();

//     // ─── MODAL STATE ────────────────────────────────────────
//     const [activeModal, setActiveModal] = useState
//         'email' | 'password' | null
//     >(null);

//     // ─── EMAIL STATE ─────────────────────────────────────────
//     const [newEmail, setNewEmail] = useState('');
//     const [emailLoading, setEmailLoading] = useState(false);
//     const [emailError, setEmailError] = useState('');

//     // ─── PASSWORD STATE ──────────────────────────────────────
//     const [currentPassword, setCurrentPassword] = useState('');
//     const [newPassword, setNewPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const [passwordLoading, setPasswordLoading] = useState(false);
//     const [passwordError, setPasswordError] = useState('');

//     // ─── SIGN OUT ────────────────────────────────────────────
//     const handleSignOut = () => {
//         Alert.alert(
//             'Sign Out',
//             'Are you sure you want to sign out?',
//             [
//                 { text: 'Cancel', style: 'cancel' },
//                 {
//                     text: 'Sign Out',
//                     style: 'destructive',
//                     onPress: async () => {
//                         await logout();
//                     },
//                 },
//             ]
//         );
//     };

//     // ─── CHANGE EMAIL ────────────────────────────────────────
//     const handleChangeEmail = async () => {
//         if (!newEmail.trim()) {
//             setEmailError('Please enter a new email address.');
//             return;
//         }

//         setEmailLoading(true);
//         setEmailError('');

//         try {
//             await updateUserAttribute({
//                 userAttribute: {
//                     attributeKey: 'email',
//                     value: newEmail.replace(/ /g, ''),
//                 },
//             });

//             setActiveModal(null);
//             setNewEmail('');

//             Alert.alert(
//                 'Verify New Email',
//                 'A verification link has been sent to your new email address. Please verify it to complete the change.',
//                 [{ text: 'OK' }]
//             );
//         } catch (err: any) {
//             console.log(err);
//             setEmailError(err?.message || 'Error updating email. Please try again.');
//         }

//         setEmailLoading(false);
//     };

//     // ─── CHANGE PASSWORD ─────────────────────────────────────
//     const handleChangePassword = async () => {
//         if (!currentPassword.trim() || !newPassword.trim()) {
//             setPasswordError('Please fill in all fields.');
//             return;
//         }

//         if (newPassword !== confirmPassword) {
//             setPasswordError('New passwords do not match.');
//             return;
//         }

//         if (newPassword.length < 8) {
//             setPasswordError('Password must be at least 8 characters.');
//             return;
//         }

//         setPasswordLoading(true);
//         setPasswordError('');

//         try {
//             await updatePassword({
//                 oldPassword: currentPassword,
//                 newPassword,
//             });

//             setActiveModal(null);
//             setCurrentPassword('');
//             setNewPassword('');
//             setConfirmPassword('');

//             Alert.alert(
//                 'Password Updated',
//                 'Your password has been changed successfully.',
//                 [{ text: 'OK' }]
//             );
//         } catch (err: any) {
//             console.log(err);
//             setPasswordError(err?.message || 'Error updating password. Please try again.');
//         }

//         setPasswordLoading(false);
//     };

//     // ─── DELETE ACCOUNT ──────────────────────────────────────
//     const handleDeleteAccount = () => {
//         Alert.alert(
//             'Delete Account',
//             'This will permanently delete your account and all associated data. This action cannot be undone.',
//             [
//                 { text: 'Cancel', style: 'cancel' },
//                 {
//                     text: 'Delete',
//                     style: 'destructive',
//                     onPress: async () => {
//                         try {
//                             // Delete user record from DynamoDB first
//                             if (userId) {
//                                 await client.models.User.delete({ id: userId });
//                             }

//                             // Delete from Cognito
//                             await deleteUser();

//                             // logout clears local state
//                             await logout();
//                         } catch (err: any) {
//                             console.log(err);
//                             Alert.alert(
//                                 'Error',
//                                 err?.message || 'Error deleting account. Please try again.'
//                             );
//                         }
//                     },
//                 },
//             ]
//         );
//     };

//     // ─── MODAL RESET ─────────────────────────────────────────
//     const closeModal = () => {
//         setActiveModal(null);
//         setNewEmail('');
//         setEmailError('');
//         setCurrentPassword('');
//         setNewPassword('');
//         setConfirmPassword('');
//         setPasswordError('');
//     };

//     return (
//         <Screen>
//             <StatusBar style="light" />

//             <ScrollView
//                 style={{ flex: 1 }}
//                 contentContainerStyle={{ paddingBottom: 60 }}
//                 showsVerticalScrollIndicator={false}
//             >
//                 {/* HEADER */}
//                 <View style={{ paddingHorizontal: 24, paddingTop: 60, marginBottom: 40 }}>
//                     <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
//                         Account
//                     </Text>
//                     <Text style={{ color: '#ffffff66', fontSize: 14, marginTop: 6 }}>
//                         Manage your account settings
//                     </Text>
//                 </View>

//                 {/* SECTION: Account */}
//                 <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
//                     <Text style={{ color: '#ffffff44', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
//                         Account
//                     </Text>

//                     <View style={{ backgroundColor: '#111', borderRadius: 18, overflow: 'hidden' }}>

//                         {/* Change Email */}
//                         <TouchableOpacity
//                             onPress={() => setActiveModal('email')}
//                             activeOpacity={0.7}
//                             style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 justifyContent: 'space-between',
//                                 padding: 18,
//                                 borderBottomWidth: 1,
//                                 borderBottomColor: '#ffffff0a',
//                             }}
//                         >
//                             <Text style={{ color: '#fff', fontSize: 15 }}>Change Email</Text>
//                             <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
//                         </TouchableOpacity>

//                         {/* Change Password */}
//                         <TouchableOpacity
//                             onPress={() => setActiveModal('password')}
//                             activeOpacity={0.7}
//                             style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 justifyContent: 'space-between',
//                                 padding: 18,
//                             }}
//                         >
//                             <Text style={{ color: '#fff', fontSize: 15 }}>Change Password</Text>
//                             <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
//                         </TouchableOpacity>
//                     </View>
//                 </View>

//                 {/* SECTION: Session */}
//                 <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
//                     <Text style={{ color: '#ffffff44', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
//                         Session
//                     </Text>

//                     <View style={{ backgroundColor: '#111', borderRadius: 18, overflow: 'hidden' }}>
//                         <TouchableOpacity
//                             onPress={handleSignOut}
//                             activeOpacity={0.7}
//                             style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 justifyContent: 'space-between',
//                                 padding: 18,
//                             }}
//                         >
//                             <Text style={{ color: '#00ffff', fontSize: 15 }}>Sign Out</Text>
//                             <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
//                         </TouchableOpacity>
//                     </View>
//                 </View>

//                 {/* SECTION: Danger Zone */}
//                 <View style={{ paddingHorizontal: 24 }}>
//                     <Text style={{ color: '#ffffff44', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
//                         Danger Zone
//                     </Text>

//                     <View style={{ backgroundColor: '#111', borderRadius: 18, overflow: 'hidden' }}>
//                         <TouchableOpacity
//                             onPress={handleDeleteAccount}
//                             activeOpacity={0.7}
//                             style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 justifyContent: 'space-between',
//                                 padding: 18,
//                             }}
//                         >
//                             <Text style={{ color: '#ff4444', fontSize: 15 }}>Delete Account</Text>
//                             <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
//                         </TouchableOpacity>
//                     </View>
//                 </View>
//             </ScrollView>

//             {/* ─── CHANGE EMAIL MODAL ─────────────────────────────── */}
//             <Modal
//                 visible={activeModal === 'email'}
//                 animationType="slide"
//                 presentationStyle="pageSheet"
//                 onRequestClose={closeModal}
//             >
//                 <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 40 }}>
//                     <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 }}>
//                         Change Email
//                     </Text>
//                     <Text style={{ color: '#ffffff66', fontSize: 14, marginBottom: 32 }}>
//                         A verification link will be sent to your new email.
//                     </Text>

//                     {emailError ? (
//                         <View style={{ backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 20 }}>
//                             <Text style={{ color: '#ff8a8a', fontSize: 13, textAlign: 'center' }}>
//                                 {emailError}
//                             </Text>
//                         </View>
//                     ) : null}

//                     <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>New Email</Text>
//                     <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 32 }}>
//                         <TextInput
//                             placeholder="Enter new email"
//                             placeholderTextColor="#ffffff33"
//                             style={{ color: '#fff', fontSize: 16 }}
//                             keyboardType="email-address"
//                             autoCapitalize="none"
//                             autoCorrect={false}
//                             value={newEmail}
//                             onChangeText={setNewEmail}
//                         />
//                     </View>

//                     {emailLoading ? (
//                         <ActivityIndicator color="#00ffff" />
//                     ) : (
//                         <TouchableOpacity
//                             onPress={handleChangeEmail}
//                             style={{ backgroundColor: '#00ffff', borderRadius: 16, padding: 18 }}
//                         >
//                             <Text style={{ color: '#000', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>
//                                 Update Email
//                             </Text>
//                         </TouchableOpacity>
//                     )}

//                     <TouchableOpacity onPress={closeModal} style={{ marginTop: 20 }}>
//                         <Text style={{ color: '#ffffff44', textAlign: 'center', fontSize: 14 }}>
//                             Cancel
//                         </Text>
//                     </TouchableOpacity>
//                 </View>
//             </Modal>

//             {/* ─── CHANGE PASSWORD MODAL ──────────────────────────── */}
//             <Modal
//                 visible={activeModal === 'password'}
//                 animationType="slide"
//                 presentationStyle="pageSheet"
//                 onRequestClose={closeModal}
//             >
//                 <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 40 }}>
//                     <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 }}>
//                         Change Password
//                     </Text>
//                     <Text style={{ color: '#ffffff66', fontSize: 14, marginBottom: 32 }}>
//                         Enter your current password and choose a new one.
//                     </Text>

//                     {passwordError ? (
//                         <View style={{ backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 20 }}>
//                             <Text style={{ color: '#ff8a8a', fontSize: 13, textAlign: 'center' }}>
//                                 {passwordError}
//                             </Text>
//                         </View>
//                     ) : null}

//                     <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>Current Password</Text>
//                     <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 16 }}>
//                         <TextInput
//                             placeholder="Enter current password"
//                             placeholderTextColor="#ffffff33"
//                             style={{ color: '#fff', fontSize: 16 }}
//                             secureTextEntry
//                             autoCapitalize="none"
//                             value={currentPassword}
//                             onChangeText={setCurrentPassword}
//                         />
//                     </View>

//                     <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>New Password</Text>
//                     <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 16 }}>
//                         <TextInput
//                             placeholder="At least 8 characters"
//                             placeholderTextColor="#ffffff33"
//                             style={{ color: '#fff', fontSize: 16 }}
//                             secureTextEntry
//                             autoCapitalize="none"
//                             value={newPassword}
//                             onChangeText={setNewPassword}
//                         />
//                     </View>

//                     <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>Confirm New Password</Text>
//                     <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 32 }}>
//                         <TextInput
//                             placeholder="Re-enter new password"
//                             placeholderTextColor="#ffffff33"
//                             style={{ color: '#fff', fontSize: 16 }}
//                             secureTextEntry
//                             autoCapitalize="none"
//                             value={confirmPassword}
//                             onChangeText={setConfirmPassword}
//                         />
//                     </View>

//                     {passwordLoading ? (
//                         <ActivityIndicator color="#00ffff" />
//                     ) : (
//                         <TouchableOpacity
//                             onPress={handleChangePassword}
//                             style={{ backgroundColor: '#00ffff', borderRadius: 16, padding: 18 }}
//                         >
//                             <Text style={{ color: '#000', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>
//                                 Update Password
//                             </Text>
//                         </TouchableOpacity>
//                     )}

//                     <TouchableOpacity onPress={closeModal} style={{ marginTop: 20 }}>
//                         <Text style={{ color: '#ffffff44', textAlign: 'center', fontSize: 14 }}>
//                             Cancel
//                         </Text>
//                     </TouchableOpacity>
//                 </View>
//             </Modal>
//         </Screen>
//     );
// };

const AccountScreen = ({ navigation }: any) => {
    const [activeModal, setActiveModal] = useState<'email' | 'password' | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const { profile, logout, userId } = useApp();
    const client = generateClient<Schema>();

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const handleChangeEmail = async () => {
        if (!newEmail.trim()) {
            setEmailError('Please enter a new email address.');
            return;
        }
        setEmailLoading(true);
        setEmailError('');
        try {
            await updateUserAttribute({
                userAttribute: {
                    attributeKey: 'email',
                    value: newEmail.replace(/ /g, ''),
                },
            });
            setActiveModal(null);
            setNewEmail('');
            Alert.alert('Verify New Email', 'A verification link has been sent to your new email address.', [{ text: 'OK' }]);
        } catch (err: any) {
            setEmailError(err?.message || 'Error updating email. Please try again.');
        }
        setEmailLoading(false);
    };

    const handleChangePassword = async () => {
        if (!currentPassword.trim() || !newPassword.trim()) {
            setPasswordError('Please fill in all fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters.');
            return;
        }
        setPasswordLoading(true);
        setPasswordError('');
        try {
            await updatePassword({ oldPassword: currentPassword, newPassword });
            setActiveModal(null);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('Password Updated', 'Your password has been changed successfully.', [{ text: 'OK' }]);
        } catch (err: any) {
            setPasswordError(err?.message || 'Error updating password. Please try again.');
        }
        setPasswordLoading(false);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all associated data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (userId) {
                                await client.models.User.delete({ id: userId });
                            }
                            await deleteUser();
                            await logout();
                        } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Error deleting account. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const closeModal = () => {
        setActiveModal(null);
        setNewEmail('');
        setEmailError('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
    };

   return (
    <Screen>
        <StatusBar style="light" />

        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
        >
            {/* HEADER */}
            <View style={{ paddingHorizontal: 24, paddingTop: 60, marginBottom: 40 }}>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
                    Account
                </Text>
                <Text style={{ color: '#ffffff66', fontSize: 14, marginTop: 6 }}>
                    Manage your account settings
                </Text>
            </View>

            {/* SECTION: Account */}
            <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
                <Text style={{ color: '#ffffff44', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                    Account
                </Text>
                <View style={{ backgroundColor: '#111', borderRadius: 18, overflow: 'hidden' }}>
                    <TouchableOpacity
                        onPress={() => setActiveModal('email')}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#ffffff0a' }}
                    >
                        <Text style={{ color: '#fff', fontSize: 15 }}>Change Email</Text>
                        <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveModal('password')}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }}
                    >
                        <Text style={{ color: '#fff', fontSize: 15 }}>Change Password</Text>
                        <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* SECTION: Session */}
            <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
                <Text style={{ color: '#ffffff44', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                    Session
                </Text>
                <View style={{ backgroundColor: '#111', borderRadius: 18, overflow: 'hidden' }}>
                    <TouchableOpacity
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }}
                    >
                        <Text style={{ color: '#00ffff', fontSize: 15 }}>Sign Out</Text>
                        <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* SECTION: Danger Zone */}
            <View style={{ paddingHorizontal: 24 }}>
                <Text style={{ color: '#ffffff44', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                    Danger Zone
                </Text>
                <View style={{ backgroundColor: '#111', borderRadius: 18, overflow: 'hidden' }}>
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }}
                    >
                        <Text style={{ color: '#ff4444', fontSize: 15 }}>Delete Account</Text>
                        <Text style={{ color: '#ffffff44', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>

        {/* CHANGE EMAIL MODAL */}
        <Modal
            visible={activeModal === 'email'}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeModal}
        >
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 40 }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 }}>
                    Change Email
                </Text>
                <Text style={{ color: '#ffffff66', fontSize: 14, marginBottom: 32 }}>
                    A verification link will be sent to your new email.
                </Text>
                {emailError ? (
                    <View style={{ backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 20 }}>
                        <Text style={{ color: '#ff8a8a', fontSize: 13, textAlign: 'center' }}>{emailError}</Text>
                    </View>
                ) : null}
                <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>New Email</Text>
                <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 32 }}>
                    <TextInput
                        placeholder="Enter new email"
                        placeholderTextColor="#ffffff33"
                        style={{ color: '#fff', fontSize: 16 }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={newEmail}
                        onChangeText={setNewEmail}
                    />
                </View>
                {emailLoading ? (
                    <ActivityIndicator color="#00ffff" />
                ) : (
                    <TouchableOpacity onPress={handleChangeEmail} style={{ backgroundColor: '#00ffff', borderRadius: 16, padding: 18 }}>
                        <Text style={{ color: '#000', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>Update Email</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeModal} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#ffffff44', textAlign: 'center', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>

        {/* CHANGE PASSWORD MODAL */}
        <Modal
            visible={activeModal === 'password'}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeModal}
        >
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 40 }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 }}>
                    Change Password
                </Text>
                <Text style={{ color: '#ffffff66', fontSize: 14, marginBottom: 32 }}>
                    Enter your current password and choose a new one.
                </Text>
                {passwordError ? (
                    <View style={{ backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 20 }}>
                        <Text style={{ color: '#ff8a8a', fontSize: 13, textAlign: 'center' }}>{passwordError}</Text>
                    </View>
                ) : null}
                <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>Current Password</Text>
                <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <TextInput
                        placeholder="Enter current password"
                        placeholderTextColor="#ffffff33"
                        style={{ color: '#fff', fontSize: 16 }}
                        secureTextEntry
                        autoCapitalize="none"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                    />
                </View>
                <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>New Password</Text>
                <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <TextInput
                        placeholder="At least 8 characters"
                        placeholderTextColor="#ffffff33"
                        style={{ color: '#fff', fontSize: 16 }}
                        secureTextEntry
                        autoCapitalize="none"
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                </View>
                <Text style={{ color: '#ffffff88', fontSize: 13, marginBottom: 8 }}>Confirm New Password</Text>
                <View style={{ backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 32 }}>
                    <TextInput
                        placeholder="Re-enter new password"
                        placeholderTextColor="#ffffff33"
                        style={{ color: '#fff', fontSize: 16 }}
                        secureTextEntry
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>
                {passwordLoading ? (
                    <ActivityIndicator color="#00ffff" />
                ) : (
                    <TouchableOpacity onPress={handleChangePassword} style={{ backgroundColor: '#00ffff', borderRadius: 16, padding: 18 }}>
                        <Text style={{ color: '#000', fontWeight: '700', textAlign: 'center', fontSize: 16 }}>Update Password</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeModal} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#ffffff44', textAlign: 'center', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    </Screen>
);
};

export default AccountScreen;