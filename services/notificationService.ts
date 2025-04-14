import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Initialize notifications
async function initializeNotifications(userId?: string, appType: 'user' | 'sitter' = 'sitter') {
  // Request permission for notifications
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  // Get push token for iOS or Android
  let token = null;
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    token = (await Notifications.getDevicePushTokenAsync()).data;
    console.log('Push Token:', token);
    
    // If userId is provided, store the token in the profiles table
    if (userId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ expo_push_token: token})
          .eq('id', userId);
        
        if (error) {
          console.error('Error storing push token:', error.message);
        } else {
          console.log('Push token stored successfully for user:', userId, 'as', appType);
        }
      } catch (err) {
        console.error('Error updating push token in Supabase:', err);
      }
    }
  }

  return token;
}

// Send a local notification for testing or immediate display
async function sendLocalNotification(title: string, body: string, data: any = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null,
  });
}

// Register notification listeners
async function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

export { initializeNotifications, sendLocalNotification, setupNotificationListeners };
