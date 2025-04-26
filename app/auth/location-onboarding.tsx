import React, { useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AddressManagerModal from '../../components/profile/AddressManagerModal';

export default function LocationOnboardingScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/locationOnboarding.png')}
        style={styles.background}
        resizeMode="contain"
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Add Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { marginTop: 20 }]}
            onPress={() => router.replace('/auth/availability-onboarding')}
          >
            <Text style={styles.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
      <AddressManagerModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddressSelected={(address) => {
          setModalVisible(false);
          router.replace('/auth/availability-onboarding');
        }}
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
    paddingHorizontal: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#62C6B9',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#62C6B9',
  },
  secondaryButtonText: {
    color: '#62C6B9',
    fontWeight: 'bold',
    fontSize: 22,
  },
});
