import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EventRegister from '../../utils/EventRegister';

interface AccountSettingsProps {
  onAddressPress: () => void;
  onAvailabilityPress: () => void;
}

const AccountSettings = ({ onAddressPress, onAvailabilityPress }: AccountSettingsProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Settings</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => EventRegister.emit('openEditProfileModal')}
      >
        <MaterialCommunityIcons name="account-edit-outline" size={24} color="#666" />
        <Text style={styles.settingText}>Edit Profile</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onAddressPress}
      >
        <MaterialCommunityIcons name="map-marker-outline" size={24} color="#666" />
        <Text style={styles.settingText}>Manage Addresses</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onAvailabilityPress}
      >
        <MaterialCommunityIcons name="clock-outline" size={24} color="#666" />
        <Text style={styles.settingText}>Set Availability</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <MaterialCommunityIcons name="bell-outline" size={24} color="#666" />
        <Text style={styles.settingText}>Notifications</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <MaterialCommunityIcons name="shield-check-outline" size={24} color="#666" />
        <Text style={styles.settingText}>Privacy & Security</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
});

export default AccountSettings; 