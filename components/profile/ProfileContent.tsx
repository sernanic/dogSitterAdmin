// ProfileContent.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import ProfileAvatar from './ProfileAvatar';
import PersonalInfo from './PersonalInfo';
import AccountSettings from './AccountSettings';
import LogoutButton from './LogoutButton';
import VersionInfo from './VersionInfo';
import EditProfileModal from './EditProfileModal';
import AddressManagerModal from './AddressManagerModal';
import AvailabilityManagerModal from './AvailabilityManagerModal';
import UnavailabilityManagerModal from './UnavailabilityManagerModal';
import EventRegister from '../../utils/EventRegister';
import { getPrimaryAddress } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  phone?: string; // From store
  phoneNumber?: string; // From database
  location?: string;
}

const ProfileContent = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [isAvailabilityModalVisible, setIsAvailabilityModalVisible] = useState(false);
  const [isUnavailabilityModalVisible, setIsUnavailabilityModalVisible] = useState(false);
  const [primaryAddress, setPrimaryAddress] = useState<any>(null);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Get user and auth store methods
  const user = useAuthStore(state => state.user) as ExtendedUser | null;
  const refreshSession = useAuthStore(state => state.refreshSession);
  const logout = useAuthStore(state => state.logout);
  const updateAvatar = useAuthStore(state => state.updateAvatar);
  const updateUser = useAuthStore(state => state.updateUser);
  const isUploading = useAuthStore(state => state.isUploading);

  // Refresh session on component mount to ensure we have the latest data
  useEffect(() => {
    console.log('Refreshing session to get latest user data...');
    refreshSession().catch(error => {
      console.error('Failed to refresh session:', error);
    });
  }, [refreshSession]);

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
      // Handle both potential field names (phone from store vs phoneNumber from DB)
      setEditProfileForm({
        name: user?.name || '',
        email: user?.email || '', 
        // Use phoneNumber if available, otherwise fall back to phone
        phoneNumber: user?.phoneNumber || user?.phone || '',
        location: user?.location || '',
      });
      setIsEditModalVisible(true);
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, [user]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/auth');
  }, [logout]);

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
      
      // Log the data being sent to help with debugging
      console.log('Updating profile with data:', {
        name: editProfileForm.name,
        phoneNumber: editProfileForm.phoneNumber,
        location: editProfileForm.location
      });
      
      // Create update object with proper typing
      const updateData: Record<string, any> = {
        name: editProfileForm.name,
      };
      
      // Special handling for phone number to work around store/database mismatch
      if (editProfileForm.phoneNumber) {
        // Send both phone and phoneNumber to cover both possible field names
        updateData.phone = editProfileForm.phoneNumber; 
        updateData.phoneNumber = editProfileForm.phoneNumber;
      }
      
      if (editProfileForm.location) {
        updateData.location = editProfileForm.location;
      }
      
      console.log('Sending update data to Supabase:', updateData);
      
      // Update profile in Supabase via your store
      await updateUser(updateData);
      
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

  const pickImage = useCallback(async () => {
    try {
      // Show action sheet for camera or gallery
      Alert.alert(
        "Update Profile Picture",
        "Choose a source",
        [
          {
            text: "Take a Photo",
            onPress: () => launchCamera(),
          },
          {
            text: "Choose from Gallery",
            onPress: () => launchImageLibrary(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Something went wrong when trying to pick an image.");
    }
  }, []);

  const launchCamera = async () => {
    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "You need to allow access to your camera to take a profile picture.");
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      handleImagePickerResult(result);
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Something went wrong when trying to take a photo.");
    }
  };

  const launchImageLibrary = async () => {
    try {
      // Request media library permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "You need to allow access to your photos to update your profile picture.");
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      handleImagePickerResult(result);
    } catch (error) {
      console.error("Image library error:", error);
      Alert.alert("Error", "Something went wrong when trying to pick an image.");
    }
  };

  const handleImagePickerResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0];
      
      // Show toast on Android or alert on iOS for upload starting
      if (Platform.OS === 'android') {
        ToastAndroid.show('Uploading profile picture...', ToastAndroid.SHORT);
      } else {
        // For iOS, show an alert
        Alert.alert('Uploading', 'Your profile picture is being uploaded...');
      }
      
      try {
        // Upload the image and update profile with timeout handling
        const uploadPromise = updateAvatar(selectedImage.uri);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000)
        );
        
        await Promise.race([uploadPromise, timeoutPromise]);
        
        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Profile picture updated successfully!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Your profile picture has been updated.');
        }
      } catch (error: any) {
        console.error('Error updating profile picture:', error);
        
        // Show error message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Failed to update profile picture', ToastAndroid.LONG);
        } else {
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        }
      }
    }
  };

  // Add new function to handle availability updates
  const handleUnavailabilityUpdated = () => {
    // Refresh profile data if needed
    loadPrimaryAddress();
  };

  if (!user?.name || !user?.email || !user?.role) return null;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar */}
        <ProfileAvatar
          avatarUrl={user.avatar_url}
          isUploading={isUploading}
          onPress={pickImage}
          name={user.name}
          role={user.role}
        />
        
        {/* Personal Information */}
        <PersonalInfo
          email={user.email}
          phoneNumber={user.phoneNumber || user.phone}
          primaryAddress={primaryAddress}
          onAddressPress={() => setIsAddressModalVisible(true)}
        />
        
        {/* Account Settings */}
        <AccountSettings
          onAddressPress={() => setIsAddressModalVisible(true)}
          onAvailabilityPress={() => setIsAvailabilityModalVisible(true)}
          onUnavailabilityPress={() => setIsUnavailabilityModalVisible(true)}
        />
        
        {/* Logout Button */}
        <LogoutButton onPress={handleLogout} />
        
        {/* Version Info */}
        <VersionInfo version="1.0.0" />
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
          // Optional: Handle availability updates if needed
          console.log('Availability updated successfully');
        }}
      />

      {/* Unavailability Modal */}
      <UnavailabilityManagerModal
        isVisible={isUnavailabilityModalVisible}
        onClose={() => setIsUnavailabilityModalVisible(false)}
        onUnavailabilityUpdated={handleUnavailabilityUpdated}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default ProfileContent;