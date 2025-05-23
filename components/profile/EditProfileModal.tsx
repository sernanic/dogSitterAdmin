import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  TouchableWithoutFeedback, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  Image,
  Alert,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface EditProfileFormData {
  name: string;
  email: string;
  phoneNumber: string;
  location: string;
  avatar_url?: string;
  background_url?: string;
}

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  formData: EditProfileFormData;
  onFormChange: (data: Partial<EditProfileFormData>) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | null;
  onUploadAvatar: (uri: string) => Promise<void>;
  onUploadBackground: (uri: string) => Promise<void>;
}

const EditProfileModal = ({
  isVisible,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
  formError,
  onUploadAvatar,
  onUploadBackground
}: EditProfileModalProps) => {
  
  const handleAvatarPress = async () => {
    Alert.alert(
      "Change Profile Picture",
      "Choose a source",
      [
        {
          text: "Take a Photo",
          onPress: launchCamera,
        },
        {
          text: "Choose from Gallery",
          onPress: launchImageLibrary,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const launchCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow camera access to change your profile picture.");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onUploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error launching camera:', error);
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const launchImageLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow gallery access to change your profile picture.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onUploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error launching image library:', error);
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const handleBackgroundPress = async () => {
    Alert.alert(
      "Change Background Image",
      "Choose a source",
      [
        { text: "Take a Photo", onPress: launchBackgroundCamera },
        { text: "Choose from Gallery", onPress: launchBackgroundImageLibrary },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const launchBackgroundCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow camera access to change your background image.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onUploadBackground(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error launching camera for background:', error);
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const launchBackgroundImageLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to allow gallery access to change your background image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onUploadBackground(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error launching image library for background:', error);
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#62C6B9" />
                </TouchableOpacity>
              </View>
              
              {formError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}
              
              <ScrollView style={styles.formContainer}>
                <View style={styles.avatarContainer}>
                  <TouchableOpacity onPress={handleAvatarPress}>
                    {formData.avatar_url ? (
                      <Image
                        source={{ uri: formData.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={40} color="#999" />
                      </View>
                    )}
                    <View style={styles.editAvatarButton}>
                      <Ionicons name="camera" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.name}
                    onChangeText={(text) => onFormChange({ name: text })}
                    placeholder="Your name"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={[styles.textInput, styles.disabledInput]}
                    value={formData.email}
                    editable={false}
                    placeholder="Your email"
                  />
                  <Text style={styles.helperText}>Email cannot be changed</Text>
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.phoneNumber}
                    onChangeText={(text) => {
                      // Allow only digits, spaces, parentheses, dashes, and plus sign
                      const formattedPhone = text.replace(/[^\d\s\(\)\-\+]/g, '');
                      onFormChange({ phoneNumber: formattedPhone });
                    }}
                    placeholder="Your phone number (e.g., +1 123-456-7890)"
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <Text style={styles.helperText}>Enter phone number with country code for best results</Text>
                </View>
                
                <View style={styles.backgroundContainer}>
                  <TouchableOpacity onPress={handleBackgroundPress}>
                    {formData.background_url ? (
                      <Image source={{ uri: formData.background_url }} style={styles.backgroundImage} />
                    ) : (
                      <View style={[styles.backgroundImage, styles.backgroundPlaceholder]}>
                        <Ionicons name="images" size={50} color="#ccc" />
                      </View>
                    )}
                    <TouchableOpacity style={styles.editBackgroundButton} onPress={handleBackgroundPress}>
                      <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  <Text style={styles.helperText}>Tap to change background image</Text>
                </View>
                
              </ScrollView>
              
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>Update Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
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
    height: '90%',
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
    color: '#62C6B9',
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
    backgroundColor: '#62C6B9',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  backgroundContainer: {
    marginBottom: 32,
  },
  backgroundImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  backgroundPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBackgroundButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: '#62C6B9',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default EditProfileModal; 