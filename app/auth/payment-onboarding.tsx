import React, { useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import PaymentSetupModal from '../../components/profile/PaymentSetupModal';

export default function PaymentOnboardingScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

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
        <Text style={styles.headerTitle}>Payment Setup</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ImageBackground
        source={require('../../assets/images/paymentOnboarding.png')}
        style={styles.background}
        resizeMode="contain"
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Add Payment Method</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, { marginTop: 20 }]} 
            onPress={() => router.push('/auth/location-onboarding')}
          >
            <Text style={styles.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
      <PaymentSetupModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSetupComplete={() => {
          setModalVisible(false);
          router.push('/auth/location-onboarding');
        }}
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
