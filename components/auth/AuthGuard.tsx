import React, { useEffect, useLayoutEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Use useLayoutEffect for immediate check before render
  useLayoutEffect(() => {
    if (!isAuthenticated) {
      // Redirect to auth screen if not authenticated
      router.replace('/auth');
    }
  }, [isAuthenticated]);

  // Also use useEffect to handle changes during component lifecycle
  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated) {
        router.replace('/auth');
      }
    };

    // Check immediately
    checkAuth();

    // Set up listener for auth changes
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isAuthenticated) {
        router.replace('/auth');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
};

export default AuthGuard;
