// ProfileHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EventRegister from '../../utils/EventRegister';

const ProfileHeader = () => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerText}>Profile</Text>
      <TouchableOpacity onPress={() => EventRegister.emit('openEditProfileModal')}>
        <Ionicons name="pencil" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ProfileHeader;