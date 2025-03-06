import React, { ReactNode, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'sitter';
}

export function ProtectedRoute({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) {
  // Access store values individually to prevent unnecessary re-renders
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userRole = useAuthStore(state => state.user?.role);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }

    if (requiredRole && userRole !== requiredRole) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, userRole, requiredRole]);

  if (!isAuthenticated || (requiredRole && userRole !== requiredRole)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute; 