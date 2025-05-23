import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Bell, Shield, CreditCard, CircleHelp as HelpCircle, LogOut, MapPin, Clock, CalendarX, AlertCircle, ArrowLeft, DollarSign } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore, User } from '../../store/useAuthStore';
import EventRegister from '../../utils/EventRegister';

// Import modals
import PasswordChangeModal from '../../components/profile/PasswordChangeModal';
import WalkingRatesModal from '../../components/profile/WalkingRatesModal';
import BoardingRatesModal from '../../components/profile/BoardingRatesModal';
import GroomingRatesModal from '../../components/profile/GroomingRatesModal';

// Import modal components
import EditProfileModal from '../../components/profile/EditProfileModal';
import AddressManagerModal from '../../components/profile/AddressManagerModal';
import AvailabilityManagerModal from '../../components/profile/AvailabilityManagerModal';
import GroomingAvailabilityManagerModal from '../../components/profile/GroomingAvailabilityManagerModal';
import UnavailabilityManagerModal from '../../components/profile/UnavailabilityManagerModal';
import PaymentSetupModal from '../../components/profile/PaymentSetupModal';
import { getPrimaryAddress, getProfileById, Profile } from '../../lib/supabase';
import { SERVICE_TYPES } from '../../constants/serviceTypes';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const user = useAuthStore(state => state.user);
  const refreshSession = useAuthStore(state => state.refreshSession);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  // Modal visibility states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [isAvailabilityModalVisible, setIsAvailabilityModalVisible] = useState(false);
  const [isGroomingAvailabilityModalVisible, setIsGroomingAvailabilityModalVisible] = useState(false);
  const [isUnavailabilityModalVisible, setIsUnavailabilityModalVisible] = useState(false);
  const [isPaymentSetupModalVisible, setIsPaymentSetupModalVisible] = useState(false);
  const [isPasswordChangeModalVisible, setIsPasswordChangeModalVisible] = useState(false);
  const [isWalkingRatesModalVisible, setIsWalkingRatesModalVisible] = useState(false);
  const [isBoardingRatesModalVisible, setIsBoardingRatesModalVisible] = useState(false);
  const [isGroomingRatesModalVisible, setIsGroomingRatesModalVisible] = useState(false);
  
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
  
  // Load primary address and full user profile when component mounts
  useEffect(() => {
    if (user?.id) {
      loadPrimaryAddress();
      loadUserProfile();
    }
  }, [user?.id]);
  
  // Load primary address from Supabase
  const loadPrimaryAddress = async () => {
    try {
      const address = await getPrimaryAddress(user?.id as string);
      setPrimaryAddress(address);
    } catch (error) {
      console.log('Error loading primary address:', error);
    }
  };
  
  // Load full user profile from Supabase
  const loadUserProfile = async () => {
    if (!user?.id) return;
    try {
      const profile = await getProfileById(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile in settings:', error);
    }
  };
  
  // Handle edit profile
  const handleEditProfile = () => {
    if (!user) return;
    
    setEditProfileForm({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      location: user.location || '',
    });
    
    setIsEditModalVisible(true);
  };
  
  // Handle form change for edit profile
  const handleFormChange = (data: Partial<typeof editProfileForm>) => {
    setEditProfileForm(prev => ({
      ...prev,
      ...data
    }));
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async (uri: string) => {
    try {
      setIsSubmitting(true);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Use the updateAvatar function from auth store
      const avatarUrl = await useAuthStore.getState().updateAvatar(uri);
      
      // Update form data with new avatar URL
      setEditProfileForm(prev => ({
        ...prev,
        avatar_url: avatarUrl
      }));
      
      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Profile picture updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.log('Error uploading avatar:', error);
      Alert.alert('Error', 'Could not update profile picture');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle background upload
  const handleBackgroundUpload = async (uri: string) => {
    try {
      setIsSubmitting(true);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Use the updateBackground function from auth store
      const backgroundUrl = await useAuthStore.getState().updateBackground(uri);
      
      // Update form data with new background URL
      setEditProfileForm(prev => ({
        ...prev,
        background_url: backgroundUrl
      }));
      
      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Background image updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Background image updated successfully!');
      }
    } catch (error) {
      console.log('Error uploading background:', error);
      Alert.alert('Error', 'Could not update background image');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit profile updates
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
      
      // Create update object
      const updateData: Record<string, any> = {
        name: editProfileForm.name,
      };
      
      if (editProfileForm.phoneNumber) {
        updateData.phoneNumber = editProfileForm.phoneNumber;
      }
      
      if (editProfileForm.location) {
        updateData.location = editProfileForm.location;
      }
      
      // Update the user profile
      await useAuthStore.getState().updateUser(updateData);
      
      // Close the modal
      setIsEditModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Profile updated successfully!');
      
      // Refresh user data
      await refreshSession();
    } catch (error) {
      setFormError('Failed to update profile. Please try again.');
      console.log('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading state
              setIsSubmitting(true);
              // Call logout from auth store
              await useAuthStore.getState().logout();
            } catch (error) {
              console.error('Logout failed:', error);
              // Show error message
              if (Platform.OS === 'android') {
                ToastAndroid.show('Logout failed', ToastAndroid.SHORT);
              } else {
                Alert.alert('Error', 'There was a problem logging out. Please try again.');
              }
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };
  
  // Handle delete account
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading indicator or disable button
              setIsSubmitting(true);
              
              // Call the delete account method
              await useAuthStore.getState().deleteAccount();
              
              // Router will redirect to login automatically when auth state changes
              // due to the auth listener in the app
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Error',
                'There was a problem deleting your account. Please try again later or contact support.',
                [{ text: 'OK' }]
              );
              setIsSubmitting(false);
            }
          } 
        }
      ]
    );
  };
  
  // Handle address manager
  const handleManageAddresses = () => {
    setIsAddressModalVisible(true);
  };
  
  // Handle availability manager
  const handleManageAvailability = async () => {
    let currentServiceType = userProfile?.service_type;

    if (currentServiceType === undefined && user?.id) {
      try {
        const profile = await getProfileById(user.id);
        setUserProfile(profile);
        currentServiceType = profile.service_type;
      } catch (error) {
        console.error('Error fetching profile for availability:', error);
        setIsAvailabilityModalVisible(true);
        return;
      }
    }
    
    if (currentServiceType === SERVICE_TYPES.GROOMING) {
      setIsGroomingAvailabilityModalVisible(true);
    } else {
      setIsAvailabilityModalVisible(true);
    }
  };
  
  // Handle unavailability manager
  const handleManageUnavailability = () => {
    setIsUnavailabilityModalVisible(true);
  };
  
  // Handle payment setup
  const handlePaymentSetup = () => {
    setIsPaymentSetupModalVisible(true);
  };
  
  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleEditProfile}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Profile</Text>
              <Text style={styles.settingDescription}>Manage your profile details</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleManageAddresses}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Address</Text>
              <Text style={styles.settingDescription}>
                {primaryAddress ? `${primaryAddress.street}, ${primaryAddress.city}` : 'Add your address'}
              </Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setIsPasswordChangeModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Password</Text>
              <Text style={styles.settingDescription}>Change your password</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          {user?.role === 'sitter' && (
            <>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handleManageAvailability}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Availability</Text>
                  <Text style={styles.settingDescription}>Set your regular availability</Text>
                </View>
                <ChevronRight size={20} color="#8E8E93" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handleManageUnavailability}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Unavailability</Text>
                  <Text style={styles.settingDescription}>Mark days you're not available</Text>
                </View>
                <ChevronRight size={20} color="#8E8E93" />
              </TouchableOpacity>
            </>
          )}
          
          {user?.role === 'sitter' && userProfile && (
            <>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handlePaymentSetup}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Payment</Text>
                  <Text style={styles.settingDescription}>Set up your payment method</Text>
                </View>
                <ChevronRight size={20} color="#8E8E93" />
              </TouchableOpacity>
            
              {userProfile.service_type === SERVICE_TYPES.WALKING_BOARDING && (
                <>
                  <TouchableOpacity 
                    style={styles.settingItem}
                    onPress={() => setIsWalkingRatesModalVisible(true)}
                  >
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Walking Rates</Text>
                      <Text style={styles.settingDescription}>Set your rates for dog walking</Text>
                    </View>
                    <ChevronRight size={20} color="#8E8E93" />
                  </TouchableOpacity>
                
                  <TouchableOpacity 
                    style={styles.settingItem}
                    onPress={() => setIsBoardingRatesModalVisible(true)}
                  >
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Boarding Rates</Text>
                      <Text style={styles.settingDescription}>Set your rates for dog boarding</Text>
                    </View>
                    <ChevronRight size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </>
              )}

              {userProfile.service_type === SERVICE_TYPES.GROOMING && (
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => setIsGroomingRatesModalVisible(true)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Grooming Rates</Text>
                    <Text style={styles.settingDescription}>Set your rates for grooming services</Text>
                  </View>
                  <ChevronRight size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItemWithSwitch}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>Receive app notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D1D6', true: '#A8DEDA' }}
              thumbColor={notificationsEnabled ? '#62C6B9' : '#F4F3F4'}
            />
          </View>
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
        </View>

        {/* Danger Zone Section */}
        <View style={[styles.section, { borderColor: '#E57373', borderWidth: 1 }]}>
          
          <TouchableOpacity 
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={handleDeleteAccount}
          >
            <Text style={{ fontSize: 16, fontFamily: 'Inter-Medium', color: '#D32F2F' }}>Delete Account</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>Read our privacy policy</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Text style={styles.settingDescription}>Read our terms of service</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#D32F2F" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
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
        onUploadAvatar={handleAvatarUpload}
        onUploadBackground={handleBackgroundUpload}
      />
      
      {/* Address Manager Modal */}
      <AddressManagerModal
        isVisible={isAddressModalVisible}
        onClose={() => {
          setIsAddressModalVisible(false);
          loadPrimaryAddress();
        }}
        onAddressSelected={() => loadPrimaryAddress()}
      />
      
      {/* Availability Manager Modal */}
      <AvailabilityManagerModal
        isVisible={isAvailabilityModalVisible}
        onClose={() => setIsAvailabilityModalVisible(false)}
        onAvailabilityUpdated={() => {}}
      />
      
      {/* Grooming Availability Manager Modal */}
      <GroomingAvailabilityManagerModal
        isVisible={isGroomingAvailabilityModalVisible}
        onClose={() => setIsGroomingAvailabilityModalVisible(false)}
        onAvailabilityUpdated={() => {}}
      />
      
      {/* Unavailability Manager Modal */}
      <UnavailabilityManagerModal
        isVisible={isUnavailabilityModalVisible}
        onClose={() => setIsUnavailabilityModalVisible(false)}
        onUnavailabilityUpdated={() => {}}
      />
      
      {/* Payment Setup Modal */}
      <PaymentSetupModal
        isVisible={isPaymentSetupModalVisible}
        onClose={() => setIsPaymentSetupModalVisible(false)}
        onSetupComplete={() => {}}
      />
      
      {/* Password Change Modal */}
      <PasswordChangeModal
        isVisible={isPasswordChangeModalVisible}
        onClose={() => setIsPasswordChangeModalVisible(false)}
      />
      
      {/* Walking Rates Modal */}
      <WalkingRatesModal
        isVisible={isWalkingRatesModalVisible}
        onClose={() => setIsWalkingRatesModalVisible(false)}
        onRatesUpdated={() => {
          // Optional: refresh data if needed
        }}
      />
      
      {/* Boarding Rates Modal */}
      <BoardingRatesModal
        isVisible={isBoardingRatesModalVisible}
        onClose={() => setIsBoardingRatesModalVisible(false)}
        onRatesUpdated={() => {
          // Optional: refresh data if needed
        }}
      />
      
      {/* Grooming Rates Modal */}
      <GroomingRatesModal
        isVisible={isGroomingRatesModalVisible}
        onClose={() => setIsGroomingRatesModalVisible(false)}
        onRatesUpdated={() => {
          // Optional: refresh data if needed
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItemWithSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#D32F2F',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
});
