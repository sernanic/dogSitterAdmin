import 'react-native-get-random-values';
import { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import AuthProvider from '../components/providers/AuthProvider';
import * as Font from 'expo-font';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error */
});

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  // Properly handle font loading with async/await
  useEffect(() => {
    async function prepare() {
      try {
        if (error) throw error;
        
        // Wait for fonts to load
        if (loaded) {
          // Keep the splash screen visible while we fetch resources
          await SplashScreen.hideAsync();
          window.frameworkReady?.();
        }
      } catch (e) {
        console.warn('Error during app initialization:', e);
      }
    }

    prepare();
  }, [loaded, error]);

  // Return null until everything is ready
  if (!loaded) {
    return null;
  }

  return (
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
  );
}