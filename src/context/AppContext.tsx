import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { getCurrentUser, signOut, signInWithRedirect } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { getOrCreateUser } from '../services/auth';
import { queryClient, queryPersister } from '../lib/queryClient';
import { getProfilePicUrl } from '../services/auth';
import { syncDownloads } from '../hooks/queries/useDownloads';
import NetInfo from '@react-native-community/netinfo';
import {
    loadAllEroticSettings,
    saveEroticEnabled,
    saveEroticInPlaylist,
    clearAllEroticSettings,
    purgeLegacyEroticPin,
} from '../lib/eroticSettings';
import { callEroticPin, PinResult } from '../lib/eroticPin';
import { showChip } from '../lib/chip';

import { Analytics } from '../lib/analytics';
import { PurchasesService } from '../lib/purchases';
import { Notifications } from '../lib/notifications';
import { unwrap } from '@/lib/amplifyResult';

// When the last automatic Google retry happened (see the sign-in failure handler below); stops a retry loop.
let lastGoogleRetryAt = 0;

const client = generateClient<Schema>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserProfile = {
    id: string;
    name?: string | null;
    profilePicUri?: string | null;
    isPublisher?: boolean | null;
    plan?: string | null;
    birthdate?: string | null;
    onboardingComplete?: boolean | null;
    preferredTagIds?: string[] | null;
    totalListenSeconds?: number | null;
    totalStoriesFinished?: number | null;
};

type AppContextType = {
    // ── Auth ────────────────────────────────────────────────────────────────
    userId: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isNewUser: boolean;
    isPremium: boolean;
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
    refreshAuth: () => Promise<void>;
    logout: () => Promise<void>;
    updateProfilePic: (uri: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
    // ── Erotic ──────────────────────────────────────────────────────────────
    isUnderAge: boolean;
    eroticEnabled: boolean;
    eroticPinEnabled: boolean;
    eroticUnlockedThisSession: boolean;
    eroticInPlaylist: boolean;
    setEroticEnabled: (value: boolean) => Promise<void>;
    setEroticPin: (pin: string) => Promise<PinResult>;
    removeEroticPin: (pin: string) => Promise<PinResult>;
    verifyEroticPin: (pin: string) => Promise<PinResult>;
    unlockEroticForSession: () => void;
    lockEroticSession: () => void;
    setEroticInPlaylist: (value: boolean) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateIsUnderAge(birthdate: string | null | undefined): boolean {
    if (!birthdate) return false;
    try {
        const birth   = new Date(birthdate);
        const ageMsec = Date.now() - birth.getTime();
        const age     = new Date(ageMsec).getUTCFullYear() - 1970;
        return age < 18;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {

    // ── Auth state ────────────────────────────────────────────────────────────
    const [userId,          setUserId]          = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading,       setIsLoading]       = useState(true);
    const [isNewUser,       setIsNewUser]       = useState(false);
    const [profile,         setProfile]         = useState<UserProfile | null>(null);
    const [isPremium, setIsPremium] = useState(false);

    // ── Erotic state ──────────────────────────────────────────────────────────
    const [isUnderAge,                setIsUnderAge]                = useState(false);
    const [eroticEnabled,             setEroticEnabledState]        = useState(false);
    const [eroticPinEnabled,          setEroticPinEnabledState]     = useState(false);
    const [eroticUnlockedThisSession, setEroticUnlockedThisSession] = useState(false);
    const [eroticInPlaylist,          setEroticInPlaylistState]     = useState(false);

    // Load persisted erotic settings from AsyncStorage on mount
    useEffect(() => {
        purgeLegacyEroticPin();
        loadAllEroticSettings().then(settings => {
            setEroticEnabledState(settings.enabled);
            setEroticInPlaylistState(settings.inPlaylist);
        });
    }, []);

    // ── Auth functions ────────────────────────────────────────────────────────

    const refreshAuth = async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const user   = await getCurrentUser();
            const dbUser = await getOrCreateUser() as any;
            const isNew  = !dbUser?.onboardingComplete && !dbUser?.birthdate;

            let profilePicUri = dbUser?.profilePicUri ?? null;
            if (profilePicUri && profilePicUri.startsWith('profile-pictures/')) {
                try {
                    profilePicUri = await getProfilePicUrl(profilePicUri);
                } catch {
                    profilePicUri = null;
                }
            }

            // Age gate — if under 18, force erotic off regardless of saved setting
            const underAge = calculateIsUnderAge(dbUser?.birthdate);
            setIsUnderAge(underAge);
            if (underAge) {
                setEroticEnabledState(false);
            }

            // Is an account PIN set? (Display only; turning erotic ON re-checks with the server.)
            callEroticPin({ action: 'status' }).then(r => {
                if (r.error !== 'server_error') setEroticPinEnabledState(r.pinSet);
            });

            setUserId(user.userId);
            setIsAuthenticated(true);
            setIsNewUser(isNew);
            setProfile({
                id:                   user.userId,
                name:                 dbUser?.name,
                profilePicUri,
                isPublisher:          dbUser?.isPublisher,
                plan:                 dbUser?.plan,
                birthdate:            dbUser?.birthdate,
                onboardingComplete:   dbUser?.onboardingComplete,
                preferredTagIds:      (dbUser?.preferredTagIds ?? []).filter(Boolean),
                totalListenSeconds:   dbUser?.totalListenSeconds,
                totalStoriesFinished: dbUser?.totalStoriesFinished,
            });
            Analytics.identify(user.userId);
            await PurchasesService.identify(user.userId);
            Notifications.registerToken(user.userId);
            const premiumStatus = await PurchasesService.isPremium();
            setIsPremium(premiumStatus);
        } catch (err) {
            setUserId(null);
            setIsAuthenticated(false);
            setIsNewUser(false);
            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfilePic = async (uri: string) => {
        if (!userId) return;
        try {
            // Store the S3 path in DynamoDB
            unwrap(await client.models.User.update({ id: userId, profilePicUri: uri }), 'Update profile picture');

            // Resolve to a signed URL for immediate display in this session
            let displayUri = uri;
            if (uri.startsWith('profile-pictures/')) {
                try {
                    displayUri = await getProfilePicUrl(uri);
                } catch { /* fall back to path */ }
            }
            setProfile(prev => prev ? { ...prev, profilePicUri: displayUri } : prev);
        } catch (err) {
            console.error('Error updating profile pic:', err);
            throw err;
        }
    };

    const refreshProfile = async () => {
        if (!userId) return;
        try {
            const { data: dbUser } = await client.models.User.get({ id: userId }) as any;
            if (!dbUser) return;
            setProfile(prev => prev ? {
                ...prev,
                totalListenSeconds:   dbUser.totalListenSeconds,
                totalStoriesFinished: dbUser.totalStoriesFinished,
            } : prev);
        } catch (err) {
            console.error('refreshProfile error:', err);
        }
    };

    const logout = async () => {
        try {
            // Stop pushes for this account reaching this phone (a different account may sign in next).
            if (userId) await Notifications.unregisterToken(userId);
            await signOut();
            queryClient.clear();
            queryPersister.removeClient();
            Analytics.reset();
            await PurchasesService.reset();
            setUserId(null);
            setIsAuthenticated(false);
            setIsNewUser(false);
            setProfile(null);
            // Session unlock resets on sign-out
            setEroticUnlockedThisSession(false);
            setEroticPinEnabledState(false);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // ── Erotic functions ──────────────────────────────────────────────────────

    const handleSetEroticEnabled = async (value: boolean) => {
        // Under-18 users cannot enable erotic content
        if (value && isUnderAge) return;

        if (!value) {
            // Disabling keeps the account PIN, so it can't be turned back on without it.
            await clearAllEroticSettings();
            setEroticEnabledState(false);
            setEroticInPlaylistState(false);
            Analytics.eroticDisabled();
            return;
        }

        // Enabling: ask the server whether a PIN is set right now, so a stale or missing local
        // value (reinstall, another phone) can never bypass the lock. If we can't tell, refuse.
        const status = await callEroticPin({ action: 'status' });
        if (status.error === 'server_error') {
            showChip("Couldn't check the PIN lock. Check your connection and try again.", 'error');
            return;
        }
        setEroticPinEnabledState(status.pinSet);
        if (status.pinSet && !eroticUnlockedThisSession) {
            showChip('Enter your PIN to turn this on.', 'error');
            return;
        }
        await saveEroticEnabled(true);
        setEroticEnabledState(true);
        Analytics.eroticEnabled();
    };

    const handleSetEroticPin = async (pin: string): Promise<PinResult> => {
        const result = await callEroticPin({ action: 'set', newPin: pin });
        if (result.ok) {
            setEroticPinEnabledState(true);
            setEroticUnlockedThisSession(true);   // they just chose it, so don't lock them out of the screen
        }
        return result;
    };

    const handleRemoveEroticPin = async (pin: string): Promise<PinResult> => {
        const result = await callEroticPin({ action: 'remove', pin });
        if (result.ok) {
            setEroticPinEnabledState(false);
            setEroticUnlockedThisSession(false);
        }
        return result;
    };

    const handleVerifyEroticPin = (pin: string): Promise<PinResult> =>
        callEroticPin({ action: 'verify', pin });

    const handleUnlockEroticForSession = () => {
        setEroticUnlockedThisSession(true);
    };

    const handleLockEroticSession = () => {
        setEroticUnlockedThisSession(false);
    };

    const handleSetEroticInPlaylist = async (value: boolean) => {
        await saveEroticInPlaylist(value);
        setEroticInPlaylistState(value);
    };

    // ── Side effects ──────────────────────────────────────────────────────────

    useEffect(() => {
        refreshAuth();
        Notifications.addNotificationTapListener();

         // Delay slightly so NavigationContainer is mounted and ready
        setTimeout(() => {
            Notifications.checkColdStartNotification();
        }, 1000);

        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                    refreshAuth();
                    break;
                case 'signInWithRedirect_failure': {
                    // The first Google sign-in for an email that already has an account links the two, and Cognito
                    // reports that as an error once. Trying again signs the person in to the linked account.
                    const reason = String((payload as any)?.data?.error?.message ?? (payload as any)?.message ?? '');
                    if (/already found an entry for username/i.test(reason) && Date.now() - lastGoogleRetryAt > 60_000) {
                        lastGoogleRetryAt = Date.now();
                        signInWithRedirect({ provider: 'Google' }).catch(e => console.warn('Google retry failed:', e));
                    }
                    break;
                }
                case 'signedOut':
                    setUserId(null);
                    setIsAuthenticated(false);
                    setIsNewUser(false);
                    setProfile(null);
                    setEroticUnlockedThisSession(false);
                    setEroticPinEnabledState(false);
                    break;
            }
        });

        return unsubscribe;
        Notifications.removeNotificationTapListener();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            syncDownloads().catch(e => console.warn('Sync downloads error:', e));
        }
    }, [isAuthenticated]);

    // Pins that were waiting for Wi-Fi download as soon as the phone joins one.
    useEffect(() => {
        if (!isAuthenticated) return;
        let lastType: string | null = null;
        const unsub = NetInfo.addEventListener(net => {
            const onWifi = net.type === 'wifi' || net.type === 'ethernet';
            if (onWifi && lastType !== null && lastType !== net.type) {
                syncDownloads().catch(e => console.warn('Sync downloads error:', e));
            }
            lastType = net.type;
        });
        return unsub;
    }, [isAuthenticated]);

    // ── Provider ──────────────────────────────────────────────────────────────

    return (
        <AppContext.Provider
            value={{
                // Auth
                userId,
                isAuthenticated,
                isLoading,
                isNewUser,
                isPremium,
                profile,
                setProfile,
                refreshAuth,
                logout,
                updateProfilePic,
                refreshProfile,
                // Erotic
                isUnderAge,
                eroticEnabled,
                eroticPinEnabled,
                eroticUnlockedThisSession,
                eroticInPlaylist,
                setEroticEnabled:       handleSetEroticEnabled,
                setEroticPin:           handleSetEroticPin,
                removeEroticPin:        handleRemoveEroticPin,
                verifyEroticPin:        handleVerifyEroticPin,
                unlockEroticForSession: handleUnlockEroticForSession,
                lockEroticSession:      handleLockEroticSession,
                setEroticInPlaylist:    handleSetEroticInPlaylist,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};