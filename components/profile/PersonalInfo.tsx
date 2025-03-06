import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PersonalInfoProps {
  email: string;
  phoneNumber?: string;
  primaryAddress: any;
  onAddressPress: () => void;
}

const PersonalInfo = ({ 
  email, 
  phoneNumber, 
  primaryAddress, 
  onAddressPress 
}: PersonalInfoProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      
      <View style={styles.infoRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={24} color="#666" />
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email || 'Not provided'}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="call" size={24} color="#666" />
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>
            {phoneNumber && phoneNumber.trim() ? phoneNumber : 'Not provided'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={24} color="#666" />
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoLabel}>Address</Text>
          <TouchableOpacity onPress={onAddressPress}>
            <Text style={styles.infoValue}>
              {primaryAddress?.formatted_address || 'Add address'}
              <Text style={styles.editLink}> (Edit)</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  editLink: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default PersonalInfo; 