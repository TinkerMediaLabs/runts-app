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

const client = generateClient<Schema>();

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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

const refreshAuth = async () => {
    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const user = await getCurrentUser();
        const dbUser = await getOrCreateUser();
        const isNew = !dbUser?.onboardingComplete && !dbUser?.birthdate;

        // Generate signed URL if profilePicUri is an S3 path
        let profilePicUri = dbUser?.profilePicUri ?? null;
        if (profilePicUri && profilePicUri.startsWith('profile-pictures/')) {
            try {
                profilePicUri = await getProfilePicUrl(profilePicUri);
            } catch {
                profilePicUri = null;
            }
        }

        setUserId(user.userId);
        setIsAuthenticated(true);
        setIsNewUser(isNew);
        setProfile({
            id: user.userId,
            name: dbUser?.name,
            profilePicUri,
            isPublisher: dbUser?.isPublisher,
            plan: dbUser?.plan,
            birthdate: dbUser?.birthdate,
            onboardingComplete: dbUser?.onboardingComplete,
            totalListenSeconds:   dbUser?.totalListenSeconds,
            totalStoriesFinished: dbUser?.totalStoriesFinished,
        });
    } catch (err) {
        setUserId(null);
        setIsAuthenticated(false);
        setIsNewUser(false);
        setProfile(null);
    } finally {
        setIsLoading(false);
    }
};

  // Update profile pic in DynamoDB and local state
  const updateProfilePic = async (uri: string) => {
    if (!userId) return;
    try {
      await client.models.User.update({
        id: userId,
        profilePicUri: uri,
      });
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
          break;
      }
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut();
      queryClient.clear();
      setUserId(null);
      setIsAuthenticated(false);
      setIsNewUser(false);
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};