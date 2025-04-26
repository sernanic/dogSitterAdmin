import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import WalkingRatesModal from '../../components/profile/WalkingRatesModal';
import BoardingRatesModal from '../../components/profile/BoardingRatesModal';

export default function ServicesOnboardingScreen() {
  const router = useRouter();
  const [walkingModalVisible, setWalkingModalVisible] = useState(false);
  const [boardingModalVisible, setBoardingModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Title Image at the top */}
      <Image
        source={require('../../assets/images/servicesTitleOnboarding.png')}
        style={styles.titleImage}
        resizeMode="contain"
      />

      {/* Container for icons and button, pushed to bottom */}
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={() => setWalkingModalVisible(true)}>
            <Image
              source={require('../../assets/images/walkingOnboardingIcon.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconMargin} onPress={() => setBoardingModalVisible(true)}>
            <Image
              source={require('../../assets/images/boardingOnboardingIcon.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.secondaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals remain outside the main layout flow */}
      <WalkingRatesModal
        isVisible={walkingModalVisible}
        onClose={() => setWalkingModalVisible(false)}
        onRatesUpdated={() => setWalkingModalVisible(false)}
      />
      <BoardingRatesModal
        isVisible={boardingModalVisible}
        onClose={() => setBoardingModalVisible(false)}
        onRatesUpdated={() => setBoardingModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFCF2',
    paddingTop: 60, // Adjust as needed for status bar/notch
  },
  titleImage: {
    width: '90%',
    height: 180, // Increased height
    alignSelf: 'center',
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1, // Takes remaining space
    justifyContent: 'flex-end', // Pushes content (icons & button) to bottom
    paddingHorizontal: 24,
    paddingBottom: 40, // Space from bottom edge
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center icons horizontally
    marginBottom: 40, // Space between icons and button
  },
  icon: {
    width: 140,
    height: 140, // Increased size
  },
  iconMargin: {
    marginLeft: 40, // Increased spacing between icons
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
