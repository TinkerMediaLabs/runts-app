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

// ---- Types ---- //
type UserProfile = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  isPublisher?: boolean | null;
  plan?: string | null;
};

type AppContextType = {
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

// ---- Context ---- //
const AppContext = createContext<AppContextType | undefined>(undefined);

// ---- Provider ---- //
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();
      const dbUser = await getOrCreateUser();

      setUserId(user.userId);
      setIsAuthenticated(true);
      setProfile({
        id: user.userId,
        name: dbUser?.name,
        avatar: dbUser?.profilePicUri,
        isPublisher: dbUser?.isPublisher,
        plan: dbUser?.plan,
      });
    } catch (err) {
      setUserId(null);
      setIsAuthenticated(false);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          refreshAuth();
          break;
        case 'signedOut':
          setUserId(null);
          setIsAuthenticated(false);
          setProfile(null);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut();
      setUserId(null);
      setIsAuthenticated(false);
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

// ---- Hook ---- //
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
