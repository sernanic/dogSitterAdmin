import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthStore, UserRole } from '@/store/useAuthStore';

// Define the shape of the user object
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phoneNumber?: string;
  location?: string;
}

// Define the shape of the context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<string>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  updateAvatar: async () => '',
});

// Provider component to wrap your app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Get auth state and methods from the Zustand store
  const {
    user,
    isAuthenticated,
    login,
    logout,
    updateUser,
    updateAvatar,
  } = useAuthStore();

  // Value to be provided by the context
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    updateUser,
    updateAvatar,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
