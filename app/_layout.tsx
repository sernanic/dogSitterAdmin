import 'react-native-get-random-values';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Stack, router, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import AuthProvider from '../components/providers/AuthProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Don't prevent auto-hiding - let splash screen hide automatically
// SplashScreen.preventAutoHideAsync().catch(() => {
//   /* ignore error */
// });

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Load fonts first
  const [loaded, error] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  // Handle auth state changes at the root level
  useEffect(() => {
    if (loaded) {
      // Only check auth state after fonts are loaded
      if (!isAuthenticated) {
        // Force redirect to auth when not authenticated
        router.replace('/auth');
      }
    }
  }, [isAuthenticated, loaded]);

  // Subscribe to auth store changes
  useEffect(() => {
    // Only set up subscription after component mounts
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isAuthenticated) {
        router.replace('/auth');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Font loading effect
  useEffect(() => {
    if (error) {
      console.warn('Error loading fonts:', error);
    }
    
    if (loaded) {
      window.frameworkReady?.();
    }
  }, [loaded, error]);

  // Return null until everything is ready
  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="auth" 
            options={{ 
              headerShown: false,
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="+not-found" 
            options={{ 
              title: 'Oops!',
              animation: 'fade',
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});