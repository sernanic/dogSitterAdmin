import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { router, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../../lib/supabase';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  
  // Use separate state for initial loading to avoid dependency cycles
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Use the stable refreshSession function from store
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Initialize auth state once on mount
  const initAuth = useCallback(async () => {
    try {
      await refreshSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [refreshSession]);

  // Set up Supabase auth state listener
  useEffect(() => {
    // Set up auth state listener to keep auth state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Refresh session to get user data
          await refreshSession();
        } else if (event === 'SIGNED_OUT') {
          // Use store logout to clear local state
          await refreshSession();
        }
      }
    );

    // Call initialization once
    initAuth();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [initAuth, refreshSession]);

  // Handle redirects based on auth state
  useEffect(() => {
    if (isInitializing) return;

    // Skip redirection if already on an auth path
    if (pathname.startsWith('/auth')) {
      return;
    }
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isInitializing, isAuthenticated, pathname]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <>{children}</>;
}

export default AuthProvider; 