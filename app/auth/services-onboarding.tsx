import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import WalkingRatesModal from '../../components/profile/WalkingRatesModal';
import BoardingRatesModal from '../../components/profile/BoardingRatesModal';
import GroomingRatesModal from '../../components/profile/GroomingRatesModal';
import { supabase, updateServiceType } from '../../lib/supabase';
import { SERVICE_TYPES } from '../../constants/serviceTypes';

export default function ServicesOnboardingScreen() {
  const router = useRouter();
  const [walkingModalVisible, setWalkingModalVisible] = useState(false);
  const [boardingModalVisible, setBoardingModalVisible] = useState(false);
  const [groomingModalVisible, setGroomingModalVisible] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<number | null>(null);
  const [isUpdatingServiceType, setIsUpdatingServiceType] = useState(false);

  const handleServiceSelection = async (serviceType: number) => {
    try {
      setIsUpdatingServiceType(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated');
        return;
      }

      // Update service type in profile
      const success = await updateServiceType(user.id, serviceType);
      
      if (success) {
        setSelectedServiceType(serviceType);
        console.log('Service type updated successfully:', serviceType);
      } else {
        console.log('Failed to update service type');
      }
    } catch (error) {
      console.log('Error updating service type:', error);
    } finally {
      setIsUpdatingServiceType(false);
    }
  };

  const handleWalkingPress = () => {
    handleServiceSelection(SERVICE_TYPES.WALKING_BOARDING);
    setWalkingModalVisible(true);
  };

  const handleBoardingPress = () => {
    handleServiceSelection(SERVICE_TYPES.WALKING_BOARDING);
    setBoardingModalVisible(true);
  };

  const handleGroomingPress = () => {
    handleServiceSelection(SERVICE_TYPES.GROOMING);
    setGroomingModalVisible(true);
  };

  const handleRatesUpdated = (serviceType: number) => {
    // Close the modal
    setWalkingModalVisible(false);
    setBoardingModalVisible(false);
    setGroomingModalVisible(false);
    
    // Navigate to appropriate availability screen based on service type
    if (serviceType === SERVICE_TYPES.GROOMING) {
      router.push('/auth/grooming-availability-onboarding');
    } else {
      router.push('/auth/availability-onboarding');
    }
  };

  const handleNextPress = () => {
    if (selectedServiceType === SERVICE_TYPES.GROOMING) {
      router.push('/auth/grooming-availability-onboarding');
    } else if (selectedServiceType === SERVICE_TYPES.WALKING_BOARDING) {
      router.push('/auth/availability-onboarding');
    } else {
      // No service selected, show alert or default behavior
      router.push('/auth/availability-onboarding');
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
        <Text style={styles.headerTitle}>Service Selection</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Title Image at the top */}
      <Image
        source={require('../../assets/images/servicesTitleOnboarding.png')}
        style={styles.titleImage}
        resizeMode="contain"
      />

      {/* Container for icons and button, pushed to bottom */}
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <TouchableOpacity 
            onPress={handleWalkingPress}
            disabled={isUpdatingServiceType}
          >
            <Image
              source={require('../../assets/images/walkingOnboardingIcon.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconMargin} 
            onPress={handleBoardingPress}
            disabled={isUpdatingServiceType}
          >
            <Image
              source={require('../../assets/images/boardingOnboardingIcon.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconMargin} 
            onPress={handleGroomingPress}
            disabled={isUpdatingServiceType}
          >
            {/* TODO: Add grooming icon asset */}
            <View style={styles.placeholderIcon}>
              <Text style={styles.placeholderText}>🐕</Text>
              <Text style={styles.placeholderLabel}>Grooming</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleNextPress}
          >
            <Text style={styles.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals remain outside the main layout flow */}
      <WalkingRatesModal
        isVisible={walkingModalVisible}
        onClose={() => setWalkingModalVisible(false)}
        onRatesUpdated={() => handleRatesUpdated(SERVICE_TYPES.WALKING_BOARDING)}
      />
      <BoardingRatesModal
        isVisible={boardingModalVisible}
        onClose={() => setBoardingModalVisible(false)}
        onRatesUpdated={() => handleRatesUpdated(SERVICE_TYPES.WALKING_BOARDING)}
      />
      <GroomingRatesModal
        isVisible={groomingModalVisible}
        onClose={() => setGroomingModalVisible(false)}
        onRatesUpdated={() => handleRatesUpdated(SERVICE_TYPES.GROOMING)}
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
  titleImage: {
    width: '90%',
    height: 180,
    alignSelf: 'center',
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    flexWrap: 'wrap',
  },
  icon: {
    width: 140,
    height: 140,
  },
  iconMargin: {
    marginLeft: 20,
  },
  placeholderIcon: {
    width: 140,
    height: 140,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#62C6B9',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#62C6B9',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
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
