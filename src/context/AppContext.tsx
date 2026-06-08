import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { getOrCreateUser } from '../services/auth';
import { queryClient } from '../lib/queryClient';
import { getProfilePicUrl } from '../services/auth';
import { syncDownloads } from '../hooks/queries/useDownloads';
import {
    loadAllEroticSettings,
    saveEroticEnabled,
    saveEroticPin,
    removeEroticPin,
    saveEroticInPlaylist,
    clearAllEroticSettings,
    getEroticPin,
} from '../lib/eroticSettings';

import { Analytics } from '../lib/analytics';

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
    totalListenSeconds?: number | null;
    totalStoriesFinished?: number | null;
};

type AppContextType = {
    // ── Auth ────────────────────────────────────────────────────────────────
    userId: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isNewUser: boolean;
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
    setEroticPin: (pin: string) => Promise<void>;
    removeEroticPin: () => Promise<void>;
    verifyEroticPin: (pin: string) => Promise<boolean>;
    unlockEroticForSession: () => void;
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

    // ── Erotic state ──────────────────────────────────────────────────────────
    const [isUnderAge,                setIsUnderAge]                = useState(false);
    const [eroticEnabled,             setEroticEnabledState]        = useState(false);
    const [eroticPinEnabled,          setEroticPinEnabledState]     = useState(false);
    const [eroticUnlockedThisSession, setEroticUnlockedThisSession] = useState(false);
    const [eroticInPlaylist,          setEroticInPlaylistState]     = useState(false);

    // Load persisted erotic settings from AsyncStorage on mount
    useEffect(() => {
        loadAllEroticSettings().then(settings => {
            setEroticEnabledState(settings.enabled);
            setEroticPinEnabledState(settings.pinEnabled);
            setEroticInPlaylistState(settings.inPlaylist);
        });
    }, []);

    // ── Auth functions ────────────────────────────────────────────────────────

    const refreshAuth = async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const user   = await getCurrentUser();
            const dbUser = await getOrCreateUser();
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
                totalListenSeconds:   dbUser?.totalListenSeconds,
                totalStoriesFinished: dbUser?.totalStoriesFinished,
            });
            Analytics.identify(user.userId, dbUser?.name ?? undefined);
        } catch {
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
            await client.models.User.update({ id: userId, profilePicUri: uri });
            setProfile(prev => prev ? { ...prev, profilePicUri: uri } : prev);
        } catch (err) {
            console.error('Error updating profile pic:', err);
            throw err;
        }
    };

    const refreshProfile = async () => {
        if (!userId) return;
        try {
            const { data: dbUser } = await client.models.User.get({ id: userId });
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
            await signOut();
            queryClient.clear();
            Analytics.reset();
            setUserId(null);
            setIsAuthenticated(false);
            setIsNewUser(false);
            setProfile(null);
            // Session unlock resets on sign-out
            setEroticUnlockedThisSession(false);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // ── Erotic functions ──────────────────────────────────────────────────────

    const handleSetEroticEnabled = async (value: boolean) => {
        // Under-18 users cannot enable erotic content
        if (value && isUnderAge) return;

        if (!value) {
            // Disabling — wipe all erotic settings including PIN
            await clearAllEroticSettings();
            setEroticEnabledState(false);
            setEroticPinEnabledState(false);
            setEroticInPlaylistState(false);
            setEroticUnlockedThisSession(false);
            Analytics.eroticDisabled();
        } else {
            await saveEroticEnabled(true);
            setEroticEnabledState(true);
            Analytics.eroticEnabled(); 
        }
    };

    const handleSetEroticPin = async (pin: string) => {
        await saveEroticPin(pin);
        // saveEroticPin saves the PIN value; also mark PIN as enabled
        const { saveEroticPinEnabled } = await import('../lib/eroticSettings');
        await saveEroticPinEnabled(true);
        setEroticPinEnabledState(true);
    };

    const handleRemoveEroticPin = async () => {
        await removeEroticPin();
        setEroticPinEnabledState(false);
    };

    const handleVerifyEroticPin = async (pin: string): Promise<boolean> => {
        const stored = await getEroticPin();
        return stored !== null && stored === pin;
    };

    const handleUnlockEroticForSession = () => {
        setEroticUnlockedThisSession(true);
    };

    const handleSetEroticInPlaylist = async (value: boolean) => {
        await saveEroticInPlaylist(value);
        setEroticInPlaylistState(value);
    };

    // ── Side effects ──────────────────────────────────────────────────────────

    useEffect(() => {
        refreshAuth();

        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                    refreshAuth();
                    break;
                case 'signedOut':
                    setUserId(null);
                    setIsAuthenticated(false);
                    setIsNewUser(false);
                    setProfile(null);
                    setEroticUnlockedThisSession(false);
                    break;
            }
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            syncDownloads().catch(e => console.warn('Sync downloads error:', e));
        }
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