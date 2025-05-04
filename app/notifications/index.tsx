import { View } from 'react-native';
import { Stack } from 'expo-router';
import NotificationsScreen from '@/screens/notifications';

export default function NotificationsRoute() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <NotificationsScreen />
    </>
  );
}
