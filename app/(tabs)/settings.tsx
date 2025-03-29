import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Bell, Shield, CreditCard, CircleHelp as HelpCircle, LogOut, MapPin, Clock, CalendarX, AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore, User } from '../../store/useAuthStore';
import EventRegister from '../../utils/EventRegister';

// Import modal components
import EditProfileModal from '../../components/profile/EditProfileModal';
import AddressManagerModal from '../../components/profile/AddressManagerModal';
import AvailabilityManagerModal from '../../components/profile/AvailabilityManagerModal';
import UnavailabilityManagerModal from '../../components/profile/UnavailabilityManagerModal';
import PaymentSetupModal from '../../components/profile/PaymentSetupModal';
import { getPrimaryAddress } from '../../lib/supabase';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const user = useAuthStore(state => state.user);
  const refreshSession = useAuthStore(state => state.refreshSession);
  
  // Modal visibility states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [isAvailabilityModalVisible, setIsAvailabilityModalVisible] = useState(false);
  const [isUnavailabilityModalVisible, setIsUnavailabilityModalVisible] = useState(false);
  const [isPaymentSetupModalVisible, setIsPaymentSetupModalVisible] = useState(false);
  
  // Other state variables
  const [primaryAddress, setPrimaryAddress] = useState<any>(null);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Load primary address when component mounts
  useEffect(() => {
    if (user?.id) {
      loadPrimaryAddress();
    }
  }, [user?.id]);
  
  // Load primary address from Supabase
  const loadPrimaryAddress = async () => {
    if (!user?.id) return;
    
    try {
      const address = await getPrimaryAddress(user.id);
      setPrimaryAddress(address);
    } catch (error) {
      console.error('Error loading primary address:', error);
    }
  };
  
  // Listen for edit profile modal open events
  useEffect(() => {
    const listener = EventRegister.addEventListener('openEditProfileModal', () => {
      // Pre-fill form with existing user data
      setEditProfileForm({
        name: user?.name || '',
        email: user?.email || '', 
        phoneNumber: user?.phoneNumber || '',
        location: user?.location || '',
      });
      setIsEditModalVisible(true);
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, [user]);
  
  const handleSubmitProfileUpdate = async () => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      // Validate form
      if (!editProfileForm.name.trim()) {
        setFormError('Name is required');
        setIsSubmitting(false);
        return;
      }
      
      // Create update object with proper typing
      const updateData: Record<string, any> = {
        name: editProfileForm.name,
      };
      
      // Special handling for phone number
      if (editProfileForm.phoneNumber) {
        updateData.phone = editProfileForm.phoneNumber; 
        updateData.phoneNumber = editProfileForm.phoneNumber;
      }
      
      if (editProfileForm.location) {
        updateData.location = editProfileForm.location;
      }
      
      // Update profile in Supabase via store
      await useAuthStore.getState().updateUser(updateData);
      
      // Close modal on success
      setIsEditModalVisible(false);
      
      // Refresh the session to get updated user data
      await refreshSession();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (data: Partial<typeof editProfileForm>) => {
    setEditProfileForm(prev => ({
      ...prev,
      ...data
    }));
  };
  
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
          onPress: () => {
            useAuthStore.getState().logout();
            router.replace('/auth');
          },
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
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => EventRegister.emit('openEditProfileModal')}
          >
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
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setIsAvailabilityModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Availability</Text>
              <Text style={styles.settingDescription}>Set your working hours</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setIsUnavailabilityModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Unavailability</Text>
              <Text style={styles.settingDescription}>Mark days you're not available</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setIsAddressModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Manage Addresses</Text>
              <Text style={styles.settingDescription}>Set your service locations</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        {user?.role === 'sitter' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payments</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setIsPaymentSetupModalVisible(true)}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Payment Setup</Text>
                <Text style={styles.settingDescription}>Set up your payment account</Text>
              </View>
              <ChevronRight size={20} color="#8E8E93" />
            </TouchableOpacity>
            
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
        )}
        
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

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy & Security</Text>
              <Text style={styles.settingDescription}>Manage your privacy preferences</Text>
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
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        isVisible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        formData={editProfileForm}
        onFormChange={handleFormChange}
        onSubmit={handleSubmitProfileUpdate}
        isSubmitting={isSubmitting}
        formError={formError}
      />

      {/* Address Manager Modal */}
      <AddressManagerModal
        isVisible={isAddressModalVisible}
        onClose={() => setIsAddressModalVisible(false)}
        onAddressSelected={(address) => {
          // Refresh primary address when an address is selected/changed
          loadPrimaryAddress();
        }}
      />

      {/* Availability Manager Modal */}
      <AvailabilityManagerModal
        isVisible={isAvailabilityModalVisible}
        onClose={() => setIsAvailabilityModalVisible(false)}
        onAvailabilityUpdated={() => {
          console.log('Availability updated successfully');
        }}
      />

      {/* Unavailability Modal */}
      <UnavailabilityManagerModal
        isVisible={isUnavailabilityModalVisible}
        onClose={() => setIsUnavailabilityModalVisible(false)}
        onUnavailabilityUpdated={() => {
          // Refresh data if needed after updating unavailability
          loadPrimaryAddress();
        }}
      />

      {/* Payment Setup Modal (For Sitters) */}
      {user?.role === 'sitter' && (
        <PaymentSetupModal
          isVisible={isPaymentSetupModalVisible}
          onClose={() => setIsPaymentSetupModalVisible(false)}
          onSetupComplete={() => {
            // Refresh session to get updated user data
            refreshSession();
            setIsPaymentSetupModalVisible(false);
          }}
        />
      )}
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