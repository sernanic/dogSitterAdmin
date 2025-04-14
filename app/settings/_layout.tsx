import { Stack } from 'expo-router';
import AuthGuard from '../../components/auth/AuthGuard';

export default function SettingsLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            title: 'Settings',
            headerShown: false,
          }}
        />
      </Stack>
    </AuthGuard>
  );
}
