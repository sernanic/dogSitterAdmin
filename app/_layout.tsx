import 'react-native-get-random-values';
import { useEffect, useRef } from 'react'; // Added useRef
import * as Notifications from 'expo-notifications'; // Added Notifications
import { useAuthStore } from '../store/useAuthStore';
import { Stack, router, Slot, useRouter } from 'expo-router'; // Added useRouter
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import AuthProvider from '../components/providers/AuthProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { registerForPushNotificationsAsync, updatePushTokenInSupabase } from '../services/notificationService'; // Added notification service import

// Let splash screen auto-hide or hide manually after assets load

// --- Notification Handlers (Outside Component) ---

// Handle notifications that arrive while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show alert even if app is open
    shouldPlaySound: false, // No sound for foreground notifications
    shouldSetBadge: true, // Update badge count
  }),
});

// --- End Notification Handlers ---


declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

// Hook to handle notification interactions (taps)
function useNotificationObserver() {
  const router = useRouter(); // Use router from expo-router

  useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const data = notification.request.content.data;
      console.log('Notification data received:', data);

      // Check if threadId exists in the data payload
      if (data && typeof data === 'object' && 'threadId' in data && data.threadId) {
        const threadId = data.threadId as string;
        console.log(`Redirecting to conversation: /conversation/${threadId}`);
        // Use router.push for navigation
        router.push(`/conversation/${threadId}`);
      } else {
        console.log('Notification tapped, but no threadId found in data.');
        // Optionally navigate to a default screen like messages list
        // router.push('/(tabs)/messages'); 
      }
    }

    // Listener for when a user taps on a notification (app foregrounded, backgrounded, or killed)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      if (isMounted) {
        redirect(response.notification);
      }
    });

    // Listener for notifications received while the app is foregrounded (optional, handled by setNotificationHandler)
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Foreground notification received:', notification);
      // You could potentially update UI here if needed, but the handler above controls the alert/badge
    });

    return () => {
      isMounted = false;
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, [router]); // Add router dependency
}


export default function RootLayout() {
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isInitialized = useAuthStore(state => state.isInitialized);

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({ // Renamed variables for clarity
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  // Call the notification observer hook
  useNotificationObserver();

  // Effect for handling authentication state and push token registration
  useEffect(() => {
    // Wait for fonts to load AND auth state to be initialized
    if (!fontsLoaded || !isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      console.log('RootLayout: Not authenticated, redirecting to /auth');
      router.replace('/auth');
    } else if (user) {
      // User is authenticated and user data is available
      console.log('RootLayout: Authenticated, registering for push notifications...');
      registerForPushNotificationsAsync()
        .then(token => {
          if (token) {
            // Update Supabase with the token and enable notifications
            console.log('RootLayout: Got push token, updating Supabase.');
            updatePushTokenInSupabase(token, user.id, true); 
          } else {
            // Failed to get token (permissions denied or other error)
            // updatePushTokenInSupabase was likely called with false inside register function
            console.log('RootLayout: Failed to get push token.');
          }
        })
        .catch(error => {
          console.error('RootLayout: Error during push notification registration:', error);
          // Optionally update Supabase to disable notifications on error
          // updatePushTokenInSupabase(null, user.id, false); 
        });
    } else {
      // Authenticated but user object is null (should ideally not happen if isInitialized is true)
      console.warn('RootLayout: Authenticated but user object is null. Cannot register push token.');
    }

  }, [isAuthenticated, fontsLoaded, user, isInitialized]); // Add user and isInitialized dependencies


  // Font loading effect (keep this separate)
  useEffect(() => {
    if (fontError) {
      console.warn('Error loading fonts:', fontError);
    }
    
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [fontsLoaded, fontError]);

  // Return null until fonts are loaded and auth is initialized
  if (!fontsLoaded || !isInitialized) {
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
