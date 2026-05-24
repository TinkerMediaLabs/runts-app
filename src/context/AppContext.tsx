import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { getOrCreateUser } from '../services/auth';

import { queryClient } from '../lib/queryClient';

type UserProfile = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  isPublisher?: boolean | null;
  plan?: string | null;
  birthdate?: string | null;
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const logout = async () => {
    try {
        await signOut();
        queryClient.clear(); // clear all cached data on sign out
        setUserId(null);
        setIsAuthenticated(false);
        setIsNewUser(false);
        setProfile(null);
    } catch (err) {
        console.error('Logout error:', err);
    }
};

  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();
      const dbUser = await getOrCreateUser();

      setUserId(user.userId);
      setIsAuthenticated(true);
      setIsNewUser(!dbUser?.name);
      setProfile({
        id: user.userId,
        name: dbUser?.name,
        avatar: dbUser?.profilePicUri,
        isPublisher: dbUser?.isPublisher,
        plan: dbUser?.plan,
        birthdate: dbUser?.birthdate,
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

    const isAdult = (() => {
      if (!profile?.birthdate) return false;
      const birth = new Date(profile.birthdate);
      const age = new Date().getFullYear() - birth.getFullYear();
      const monthDiff = new Date().getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birth.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    })();

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