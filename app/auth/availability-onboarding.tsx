import React, { useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import AvailabilityManagerModal from '../../components/profile/AvailabilityManagerModal';
import UnavailabilityManagerModal from '../../components/profile/UnavailabilityManagerModal';

export default function AvailabilityOnboardingScreen() {
  const router = useRouter();
  const [availModalVisible, setAvailModalVisible] = useState(false);
  const [unavailModalVisible, setUnavailModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability Setup</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ImageBackground
        source={require('../../assets/images/availability-onboarding.png')}
        style={styles.background}
        resizeMode="contain"
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => setAvailModalVisible(true)}>
            <Text style={styles.buttonText}>Set Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => setUnavailModalVisible(true)}
          >
            <Text style={styles.buttonText}>Set Unavailability</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { marginTop: 20 }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <AvailabilityManagerModal
        isVisible={availModalVisible}
        onClose={() => setAvailModalVisible(false)}
        onAvailabilityUpdated={() => setAvailModalVisible(false)}
      />
      <UnavailabilityManagerModal
        isVisible={unavailModalVisible}
        onClose={() => setUnavailModalVisible(false)}
        onUnavailabilityUpdated={() => setUnavailModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FCFCF2' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textAlign: 'center',
  },
  background: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    width: '100%' 
  },
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
