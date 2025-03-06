
// ProfileScreen.tsx
import React from 'react';
import { ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileContent from '../../components/profile/ProfileContent';

export default function ProfileScreen() {
  return (
    <ProtectedRoute>
      <ScrollView style={styles.fullContainer}>
        <SafeAreaView style={styles.fullContainer}>
          <ProfileHeader />
          <ProfileContent />
        </SafeAreaView>
      </ScrollView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
});