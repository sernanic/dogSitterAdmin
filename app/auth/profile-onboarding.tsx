import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const refreshSession = useAuthStore(state => state.refreshSession);
  const updateAvatar = useAuthStore(state => state.updateAvatar);
  const updateBackground = useAuthStore(state => state.updateBackground);

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    location: user?.location || '',
    avatar_url: user?.avatar_url || '',
    background_url: user?.background_url || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        location: user.location || '',
        avatar_url: user.avatar_url || '',
        background_url: user.background_url || ''
      });
    }
  }, [user]);

  const handleFormChange = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleUploadAvatar = async (uri: string) => {
    try {
      setIsSubmitting(true);
      const avatarUrl = await updateAvatar(uri);
      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.log('Error uploading avatar:', error);
      Alert.alert('Error', 'Could not update profile picture');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadBackground = async (uri: string) => {
    try {
      setIsSubmitting(true);
      const backgroundUrl = await updateBackground(uri);
      setFormData(prev => ({ ...prev, background_url: backgroundUrl }));
      Alert.alert('Success', 'Background image updated!');
    } catch (error) {
      console.log('Error uploading background:', error);
      Alert.alert('Error', 'Could not update background image');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const updateData: Record<string, any> = { name: formData.name };
      if (formData.phoneNumber) updateData.phoneNumber = formData.phoneNumber;
      if (formData.location) updateData.location = formData.location;
      await updateUser(updateData);
      await refreshSession();
      setModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.log('Error updating profile:', error);
      setFormError('Could not update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/profile-onboarding.png')}
        style={styles.background}
        resizeMode="contain"
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Add Profile Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { marginTop: 20 }]}
            onPress={() => router.push('/auth/payment-onboarding')}
          >
            <Text style={styles.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <EditProfileModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        formError={formError}
        onUploadAvatar={handleUploadAvatar}
        onUploadBackground={handleUploadBackground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFCF2' },
  background: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: '15%',
    paddingHorizontal: 24
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#62C6B9',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#62C6B9'
  },
  secondaryButtonText: {
    color: '#62C6B9',
    fontWeight: 'bold',
    fontSize: 22
  }
});
