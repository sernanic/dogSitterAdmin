import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  Alert,
  ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import GroomingAvailabilityManagerModal from '../../components/profile/GroomingAvailabilityManagerModal';

export default function GroomingAvailabilityOnboardingScreen() {
  const router = useRouter();
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [hasSetAvailability, setHasSetAvailability] = useState(false);

  const handleSetAvailability = () => {
    setAvailabilityModalVisible(true);
  };

  const handleAvailabilityUpdated = () => {
    setHasSetAvailability(true);
    setAvailabilityModalVisible(false);
    Alert.alert(
      'Great!',
      'Your grooming schedule has been set. You can always update it later in your profile.',
      [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)')
        }
      ]
    );
  };

  const handleSkipForNow = () => {
    Alert.alert(
      'Skip for now?',
      'You can set your grooming availability later in your profile. Pet owners won\'t be able to book appointments until you set your schedule.',
      [
        {
          text: 'Go Back',
          style: 'cancel'
        },
        {
          text: 'Skip for Now',
          onPress: () => router.replace('/(tabs)')
        }
      ]
    );
  };

  const handleContinue = () => {
    if (hasSetAvailability) {
      router.replace('/(tabs)');
    } else {
      Alert.alert(
        'Set Your Schedule',
        'Please set your grooming schedule to continue, or skip for now.',
        [
          {
            text: 'Set Schedule',
            onPress: handleSetAvailability
          },
          {
            text: 'Skip for Now',
            onPress: handleSkipForNow,
            style: 'destructive'
          }
        ]
      );
    }
  };

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
        <Text style={styles.headerTitle}>Grooming Availability</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* <ImageBackground
        source={require('../../assets/images/groomingAvailabilityOnboarding.png')}
        style={styles.background}
        resizeMode="contain"
      > */}
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Set Your Grooming Schedule</Text>
            <Text style={styles.subtitle}>
              Let pet owners know when you're available for grooming appointments. 
              You can set specific time slots for different days of the week.
            </Text>
            
            {hasSetAvailability && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>✓ Grooming schedule set!</Text>
                <Text style={styles.successSubText}>
                  You can always update your availability in your profile.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={handleSetAvailability}
            >
              <Text style={styles.buttonText}>
                {hasSetAvailability ? 'Update Schedule' : 'Set Grooming Schedule'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.button}
              onPress={hasSetAvailability ? handleContinue : handleSkipForNow}
            >
              <Text style={styles.buttonText}>
                {hasSetAvailability ? 'Continue' : 'Skip for Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      {/* </ImageBackground> */}

      <GroomingAvailabilityManagerModal
        isVisible={availabilityModalVisible}
        onClose={() => setAvailabilityModalVisible(false)}
        onAvailabilityUpdated={handleAvailabilityUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFCF2',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 60,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: '#62C6B9',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#62C6B9',
  },
  secondaryButtonText: {
    color: '#62C6B9',
    fontWeight: 'bold',
    fontSize: 18,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
    marginTop: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  successSubText: {
    fontSize: 14,
    color: '#388E3C',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
}); 