import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

import { getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';

// ---- Types ---- //

type UserProfile = {
  name?: string;
  avatar?: string;
};

type AppContextType = {
  userId: string | null;
  isAuthenticated: boolean;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // 🔐 Check auth state on app load
  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();

      if (user && session) {
        setUserId(user.userId);
        setIsAuthenticated(true);
      }
    } catch (err) {
      setUserId(null);
      setIsAuthenticated(false);
    }
  };

  // 🚀 Run on mount
  useEffect(() => {
    refreshAuth();
  }, []);

  // 🚪 Logout
  const logout = async () => {
    try {
      await signOut();

      // Reset all local state
      setUserId(null);
      setIsAuthenticated(false);
      setProfile(null);

      // 🔥 IMPORTANT: clear React Query cache if you're using it
      // queryClient.clear(); ← you’ll wire this where queryClient exists
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        userId,
        isAuthenticated,
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
