import React, { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { supabase } from '../../lib/supabase';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  
  // Use separate state for initial loading to avoid dependency cycles
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Use the stable refreshSession function from store
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Add timeout reference
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize auth state once on mount
  const initAuth = useCallback(async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a shorter timeout to prevent long loading
    timeoutRef.current = setTimeout(() => {
      console.warn('Auth initialization timed out');
      setInitError('Authentication initialization timed out');
      setIsInitializing(false);
    }, 3000); // Reduced from 10s to 3s

    try {
      await refreshSession();
      // Clear the timeout if successful
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setInitError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return children immediately without showing a spinner
  if (isInitializing) {
    return <>{children}</>;
  }
  
  // Show error screen if there was an initialization error
  if (initError) {
    console.warn('Auth init error:', initError);
    // Continue to render the app instead of showing error
    // This allows the redirect to auth screen to happen
  }

  return <>{children}</>;
}

export default AuthProvider; 