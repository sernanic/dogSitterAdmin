
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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../store/useAuthStore';
import { getPortfolioImages, uploadPortfolioImage, deletePortfolioImage, PortfolioImage } from '../../lib/supabase';
import { Camera, Plus, Grid3x3, X, Settings, ImageIcon, Images } from 'lucide-react-native';
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
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch portfolio images on component mount
  useEffect(() => {
    if (user) {
      fetchPortfolioImages();
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
      console.error('Error fetching portfolio images:', error);
      Alert.alert('Error', 'Could not load portfolio images');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      console.error('Error launching camera:', error);
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
      console.error('Error launching image library:', error);
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
      console.error('Error uploading image:', error);
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
              console.error('Error deleting image:', error);
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
      console.error('Error updating profile:', error);
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
          <TouchableOpacity onPress={() => router.push('/settings/')}>

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
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handleEditProfile}>
              <Image 
                source={{ 
                  uri: user.avatar_url || 'https://via.placeholder.com/150' 
                }} 
                style={styles.profileImage} 
              />
            </TouchableOpacity>
            
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{portfolioImages.length}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              
              <TouchableOpacity style={styles.statItem} onPress={handleEditProfile}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userRole}>Dog Sitter</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{user.location || 'Add your location in profile settings'}</Text>
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
        />
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
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
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#F0F0F0',
  },
  profileStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
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
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  bioText: {
    fontSize: 14,
    color: '#444',
    fontFamily: 'Inter-Regular',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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