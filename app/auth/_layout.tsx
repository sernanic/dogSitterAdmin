import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="login" />
      <Stack.Screen name="profile-onboarding" />
      <Stack.Screen name="payment-onboarding" />
      <Stack.Screen name="location-onboarding" />
      <Stack.Screen name="services-onboarding" />
      <Stack.Screen name="availability-onboarding" />
      <Stack.Screen name="grooming-availability-onboarding" />
    </Stack>
  );
}