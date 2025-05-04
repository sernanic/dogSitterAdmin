// ProfileScreen.tsx with Instagram-like layout
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  RefreshControl,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  Dimensions,
  ImageSourcePropType,
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../store/useAuthStore';
import { getPortfolioImages, uploadPortfolioImage, deletePortfolioImage, PortfolioImage, uploadAvatar, updateAvatarUrl, uploadProfileBackground, updateBackgroundUrl } from '../../lib/supabase';
import { Camera, Plus, Grid3x3, X, Settings, ImageIcon, Images, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import EditProfileModal from '../../components/profile/EditProfileModal';

export default function ProfileScreen() {
  // State management
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const refreshSession = useAuthStore(state => state.refreshSession);
  
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
    avatar_url: '',
    background_url: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  // Fetch portfolio images on component mount
  useEffect(() => {
    if (user) {
      fetchPortfolioImages();
      // Initialize form data with user info
      setEditProfileForm({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        location: user.location || '',
        avatar_url: user.avatar_url || '',
        background_url: user.background_url || '',
      });
    }
  }, [user]);

  // Fetch portfolio images
  const fetchPortfolioImages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const images = await getPortfolioImages(user.id);
      setPortfolioImages(images);
    } catch (error) {
      console.log('Error fetching portfolio images:', error);
      Alert.alert('Error', 'Could not load portfolio images');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (uri: string) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Upload avatar to storage
      const avatarUrl = await uploadAvatar(user.id, uri);
      
      // Update profile with new avatar URL
      await updateAvatarUrl(user.id, avatarUrl);
      
      // Update local state
      setEditProfileForm(prev => ({ ...prev, avatar_url: avatarUrl }));
      
      // Update user in auth store
      updateUser({ ...user, avatar_url: avatarUrl });
      
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

  // Handle background image upload
  const handleBackgroundUpload = async () => {
    if (!user) return;
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow gallery access to upload photos.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingBackground(true);
        
        try {
          // Upload background to storage
          const backgroundUrl = await uploadProfileBackground(user.id, result.assets[0].uri);
          
          // Update profile with new background URL
          await updateBackgroundUrl(user.id, backgroundUrl);
          
          // Update local state
          setEditProfileForm(prev => ({ ...prev, background_url: backgroundUrl }));
          
          // Update user in auth store
          updateUser({ ...user, background_url: backgroundUrl });
          
          // Show success message
          if (Platform.OS === 'android') {
            ToastAndroid.show('Background updated successfully!', ToastAndroid.SHORT);
          } else {
            Alert.alert('Success', 'Background updated successfully!');
          }
        } catch (error) {
          console.log('Error uploading background:', error);
          Alert.alert('Error', 'Could not update background image');
        } finally {
          setUploadingBackground(false);
        }
      }
    } catch (error) {
      console.log('Error launching image library:', error);
      Alert.alert('Error', 'Could not open gallery');
      setUploadingBackground(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPortfolioImages();
  }, []);

  // Handle upload image
  const handleUploadImage = useCallback(() => {
    Alert.alert(
      "Upload Portfolio Image",
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
  }, []);

  // Launch camera
  const launchCamera = async () => {
    if (!user) return;
    
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow camera access to upload photos.");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error launching camera:', error);
      Alert.alert('Error', 'Could not open camera');
    }
  };

  // Launch image library
  const launchImageLibrary = async () => {
    if (!user) return;
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow gallery access to upload photos.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error launching image library:', error);
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  // Upload image to Supabase
  const uploadImage = async (uri: string) => {
    if (!user) return;
    
    try {
      setUploading(true);
      
      // Show upload started message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Uploading image...', ToastAndroid.SHORT);
      } else {
        Alert.alert('Uploading', 'Image is being uploaded...');
      }
      
      const description = ''; // You could prompt for a description here
      await uploadPortfolioImage(user.id, uri, description);
      
      // Refresh portfolio images
      await fetchPortfolioImages();
      
      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Image uploaded successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Image uploaded successfully!');
      }
    } catch (error) {
      console.log('Error uploading image:', error);
      Alert.alert('Error', 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDeleteImage = (image: PortfolioImage) => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePortfolioImage(image.id, image.image_url);
              // Update state to remove the deleted image
              setPortfolioImages(prevImages => 
                prevImages.filter(img => img.id !== image.id)
              );
              
              // Show success message
              if (Platform.OS === 'android') {
                ToastAndroid.show('Image deleted successfully!', ToastAndroid.SHORT);
              } else {
                Alert.alert('Success', 'Image deleted successfully!');
              }
            } catch (error) {
              console.log('Error deleting image:', error);
              Alert.alert('Error', 'Could not delete image');
            }
          },
        },
      ]
    );
  };

  // Handle edit profile
  const handleEditProfile = () => {
    if (!user) return;
    
    setEditProfileForm({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      location: user.location || '',
      avatar_url: user.avatar_url || '',
      background_url: user.background_url || '',
    });
    
    setIsEditModalVisible(true);
  };

  // Submit profile update
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
      
      // Update profile
      await updateUser(updateData);
      
      // Close modal and refresh session
      setIsEditModalVisible(false);
      await refreshSession();
      
      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Profile updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.log('Error updating profile:', error);
      setFormError('Could not update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form change
  const handleFormChange = (data: Partial<typeof editProfileForm>) => {
    setEditProfileForm(prev => ({
      ...prev,
      ...data
    }));
  };

  // Calculate image dimensions - 3 per row with small gap between items
  const screenWidth = Dimensions.get('window').width;
  const imageSize = (screenWidth - 8) / 3; // 8 accounts for margins (2px on each side)
  
  // Render portfolio image item
  const renderPortfolioItem = ({ item }: { item: PortfolioImage }) => (
    <TouchableOpacity 
      style={[styles.portfolioItem, { width: imageSize, height: imageSize }]}
      onPress={() => Alert.alert('Image Preview', '', [
        { text: 'Close', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteImage(item) }
      ])}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.image_url }} 
        style={styles.portfolioImage}
        resizeMode="cover" 
      />
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteImage(item)}
      >
        <X size={16} color="#FFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <ProtectedRoute>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#62C6B9" />
        </View>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Settings size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#62C6B9']}
              tintColor="#62C6B9"
            />
          }
        >
          {/* Background Image Area */}
          <View style={styles.backgroundContainer}>
            <ImageBackground 
              source={user.background_url ? { uri: user.background_url } : require('../../assets/images/default-background.jpg')} 
              style={styles.backgroundImage}
              resizeMode="cover"
            >
              <TouchableOpacity 
                style={styles.editBackgroundButton} 
                onPress={handleBackgroundUpload}
                disabled={uploadingBackground}
              >
                {uploadingBackground ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Edit2 size={16} color="#FFF" />
                )}
              </TouchableOpacity>
              
              <View style={styles.profileImageContainer}>
                <TouchableOpacity onPress={handleEditProfile}>
                  {user.avatar_url ? (
                    <Image 
                      source={{ uri: user.avatar_url }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                      <Ionicons name="person" size={40} color="#999" />
                    </View>
                  )}
                  <View style={styles.editProfileButton}>
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
          
          <View style={styles.profileInfoCard}>
            <Text style={styles.profileName}>{user.name}</Text>
            
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{portfolioImages.length}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
            </View>
            
            {user.location && (
              <View style={styles.bioSection}>
                <Text style={styles.bioText}>{user.location}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioTitle}>Portfolio</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleUploadImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Plus size={16} color="#FFF" />
                  <Text style={styles.addButtonText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {loading && portfolioImages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#62C6B9" />
            </View>
          ) : portfolioImages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Images size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No portfolio images yet</Text>
              <Text style={styles.emptySubtext}>Add photos to showcase your dog sitting services</Text>
              <TouchableOpacity 
                style={styles.emptyAddButton}
                onPress={handleUploadImage}
              >
                <Text style={styles.emptyAddButtonText}>Add Your First Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={portfolioImages}
              renderItem={renderPortfolioItem}
              keyExtractor={item => item.id}
              numColumns={3}
              contentContainerStyle={styles.portfolioGrid}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: 'flex-start' }}
            />
          )}
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
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  profileImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  editProfileButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#62C6B9',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Inter-Bold',
  },
  scrollView: {
    flex: 1,
  },
  backgroundContainer: {
    width: '100%',
    height: 200,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  editBackgroundButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    zIndex: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileInfoCard: {
    marginTop: 50,
    padding: 16,
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Inter-SemiBold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  bioSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  bioText: {
    fontSize: 14,
    color: '#444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Inter-SemiBold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#62C6B9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
  },
  portfolioGrid: {
    paddingHorizontal: 2,
  },
  portfolioItem: {
    margin: 1,
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    fontFamily: 'Inter-SemiBold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  emptyAddButton: {
    backgroundColor: '#62C6B9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyAddButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});