import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Bell, Shield, CreditCard, CircleHelp as HelpCircle, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          onPress: () => router.replace('/auth'),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Personal Information</Text>
              <Text style={styles.settingDescription}>Update your profile details</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Password</Text>
              <Text style={styles.settingDescription}>Change your password</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Linked Accounts</Text>
              <Text style={styles.settingDescription}>Connect social accounts</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>Manage push notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E5E5', true: '#62C6B9' }}
              thumbColor="#FFF"
              ios_backgroundColor="#E5E5E5"
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Availability</Text>
              <Text style={styles.settingDescription}>Set your working hours</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Service Area</Text>
              <Text style={styles.settingDescription}>Set your service radius</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payment Methods</Text>
              <Text style={styles.settingDescription}>Manage your payment options</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payout Information</Text>
              <Text style={styles.settingDescription}>Set up your bank account</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Transaction History</Text>
              <Text style={styles.settingDescription}>View your past transactions</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Help Center</Text>
              <Text style={styles.settingDescription}>Get help with the app</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Contact Support</Text>
              <Text style={styles.settingDescription}>Reach out to our team</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#62C6B9',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 10,
    fontFamily: 'Inter-Medium',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 30,
    fontFamily: 'Inter-Regular',
  },
});