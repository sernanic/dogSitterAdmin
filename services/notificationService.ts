import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase'; // Adjust path if needed
import { useAuthStore } from '../store/useAuthStore'; // Adjust path if needed

/**
 * Initialize notification configurations. This sets up notification listeners.
 * Note: Push token registration is already handled in the app _layout.tsx
 */
export async function initializeNotifications(): Promise<void> {
  // This function is referenced by HomeScreen but was missing
  // It's now a no-op since the actual notification setup happens in _layout.tsx
  console.log('Notifications already initialized in _layout.tsx');
  return Promise.resolve();
}

/**
 * Registers the device for push notifications and returns the Expo push token.
 * Handles permission requests and checks for physical device.
 * @returns {Promise<string | null>} The Expo push token or null if failed.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    // Optionally, you could return a specific value or throw an error
    // depending on how you want to handle simulators/emulators.
    return null; 
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('Requesting push notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token: Permissions not granted.');
      // Update profile to reflect disabled notifications if desired
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await updatePushTokenInSupabase(null, userId, false); // Explicitly disable
      }
      return null;
    }

    // Ensure we use the correct projectId from app.config.js/app.json
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('Failed to get push token: EAS Project ID not found in app config.');
      return null;
    }
    console.log(`Fetching Expo push token for project ID: ${projectId}`);

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token:', token);

    // --- Android Specific Channel Setup ---
    // Although focusing on iOS first, it's good practice to include this
    // It won't run on iOS but keeps the service complete.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C', // Consider using your app theme color
      });
    }
    // --- End Android Specific ---

  } catch (error) {
    console.error('Error getting push token:', error);
    token = null; // Ensure token is null on error
  }

  return token;
}

/**
 * Updates the user's profile in Supabase with the Expo push token and notification status.
 * @param {string | null} token The Expo push token (or null to remove).
 * @param {string} userId The ID of the user to update.
 * @param {boolean} enabled The desired notification enabled status.
 */
export async function updatePushTokenInSupabase(token: string | null, userId: string, enabled: boolean): Promise<void> {
  if (!userId) {
    console.error('Cannot update push token: User ID is missing.');
    return;
  }

  console.log(`Updating profile for user ${userId}: token=${token ? 'present' : 'null'}, enabled=${enabled}`);

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        expo_push_token: token, 
        notifications_enabled: enabled,
        updated_at: new Date().toISOString() // Good practice to update timestamp
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating push token in Supabase:', error);
      // Consider throwing the error or handling it based on app needs
      // throw error; 
    } else {
      console.log(`Successfully updated push token status for user ${userId}`);
    }
  } catch (err) {
    console.error('Unexpected error during Supabase update:', err);
  }
}
