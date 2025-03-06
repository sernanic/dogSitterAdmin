import 'react-native-get-random-values';
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, ToastAndroid, Platform, Modal, TextInput, TouchableWithoutFeedback, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import EventRegister from '../../utils/EventRegister';
import AddressManager from '../../components/AddressManager';
import { getPrimaryAddress } from '../../lib/supabase';

// Extended User type with additional profile fields
interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  phoneNumber?: string; // Changed from phone to phoneNumber
  location?: string;
}

export default function ProfileScreen() {
  return (
    <ProtectedRoute>
      <ScrollView style={styles.fullContainer}>
        <SafeAreaView style={styles.fullContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Profile</Text>
            <TouchableOpacity onPress={() => {
              EventRegister.emit('openEditProfileModal');
            }}>
              <Ionicons name="pencil" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ProfileContent />
        </SafeAreaView>
      </ScrollView>
    </ProtectedRoute>
  );
}

export function ProfileContent() {
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [primaryAddress, setPrimaryAddress] = useState<any>(null);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  
  const user = useAuthStore(state => state.user) as ExtendedUser | null;
  const refreshSession = useAuthStore(state => state.refreshSession);
  console.log('Complete user object:', JSON.stringify(user, null, 2));
  
  const name = user?.name;
  const email = user?.email;
  const role = user?.role;
  const avatarUrl = user?.avatar_url;
  
  const logout = useAuthStore(state => state.logout);
  const updateAvatar = useAuthStore(state => state.updateAvatar);
  const updateUser = useAuthStore(state => state.updateUser);
  const isUploading = useAuthStore(state => state.isUploading);
  console.log('avatarUrl', avatarUrl);
  console.log('role', role);

  // Refresh session on component mount to ensure we have the latest data
  useEffect(() => {
    console.log('Refreshing session to get latest user data...');
    refreshSession().catch(error => {
      console.error('Failed to refresh session:', error);
    });
    
    // Reset image states on mount
    setIsImageLoading(false);
    setImageError(false);
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
      
      // Update profile in Supabase via your store
      await updateUser({
        name: editProfileForm.name,
        // Use any to bypass TypeScript checking temporarily
        ...(editProfileForm.phoneNumber ? { phoneNumber: editProfileForm.phoneNumber } as any : {}),
        ...(editProfileForm.location ? { location: editProfileForm.location } as any : {})
      });
      
      // Close modal on success
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        mediaTypes: "images",
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
        mediaTypes: "images",
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
      
      // Log image details for debugging
      console.log("Selected image:", {
        uri: selectedImage.uri,
        width: selectedImage.width,
        height: selectedImage.height,
        type: selectedImage.type,
        fileSize: selectedImage.fileSize
      });
      
      // Reset error state
      setUploadError(null);
      
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
        
        const newAvatarUrl = await Promise.race([uploadPromise, timeoutPromise]);
        
        console.log("Avatar updated successfully:", newAvatarUrl);
        
        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Profile picture updated successfully!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Your profile picture has been updated.');
        }
      } catch (error: any) {
        console.error('Error updating profile picture:', error);
        setUploadError(error.message || 'Failed to update profile picture');
        
        // Show error message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Failed to update profile picture', ToastAndroid.LONG);
        } else {
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        }
      }
    }
  };

  if (!name || !email || !role) {
    return null;
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {isImageLoading && (
              <View style={[styles.avatar, styles.avatarLoading]}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            )}
            
            {imageError ? (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <FontAwesome5 name="user-alt" size={50} color="#718096" />
              </View>
            ) : avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                onLoadStart={() => {
                  console.log("Loading avatar...");
                  setIsImageLoading(true);
                  setImageError(false);
                }}
                onLoad={() => {
                  console.log("Avatar loaded successfully");
                  setIsImageLoading(false);
                }}
                onError={() => {
                  console.error("Failed to load avatar");
                  setImageError(true);
                  setIsImageLoading(false);
                }}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <FontAwesome5 name="user-alt" size={50} color="#718096" />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={pickImage}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons name="pencil" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
        </View>

        {/* Personal Information */}
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
              <Text style={styles.infoValue}>{user?.phoneNumber || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={24} color="#666" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Address</Text>
              <TouchableOpacity onPress={() => setIsAddressModalVisible(true)}>
                <Text style={styles.infoValue}>
                  {primaryAddress?.formatted_address || 'Add address'}
                  <Text style={styles.editLink}> (Edit)</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Profile Sections */}
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
            onPress={() => setIsAddressModalVisible(true)}
          >
            <MaterialCommunityIcons name="map-marker-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Manage Addresses</Text>
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.version}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                {formError && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                )}
                
                <ScrollView style={styles.formContainer}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editProfileForm.name}
                      onChangeText={(text) => setEditProfileForm(prev => ({...prev, name: text}))}
                      placeholder="Your name"
                    />
                  </View>
                  
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      style={[styles.textInput, styles.disabledInput]}
                      value={editProfileForm.email}
                      editable={false}
                      placeholder="Your email"
                    />
                    <Text style={styles.helperText}>Email cannot be changed</Text>
                  </View>
                  
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editProfileForm.phoneNumber}
                      onChangeText={(text) => setEditProfileForm(prev => ({...prev, phoneNumber: text}))}
                      placeholder="Your phone number"
                      keyboardType="phone-pad"
                    />
                  </View>
                  
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Location</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editProfileForm.location}
                      onChangeText={(text) => setEditProfileForm(prev => ({...prev, location: text}))}
                      placeholder="Your location"
                    />
                  </View>
                </ScrollView>
                
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                  onPress={handleSubmitProfileUpdate}
                  disabled={isSubmitting}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting ? 'Updating...' : 'Update Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Address Manager Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddressModalVisible}
        onRequestClose={() => setIsAddressModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAddressModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Manage Addresses</Text>
                  <TouchableOpacity onPress={() => setIsAddressModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <AddressManager 
                  onAddressSelected={(address) => {
                    // Refresh primary address when an address is selected/changed
                    loadPrimaryAddress();
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
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
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ff4444',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    position: 'absolute',
    zIndex: 1,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    position: 'absolute',
    zIndex: 1,
  },
  fullContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '67%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
  },
  formContainer: {
    flex: 1,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#555',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
  },
  helperText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  submitButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});