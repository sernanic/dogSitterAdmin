import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase, getSitterInfo, updateWalkingRates } from '../../lib/supabase';

interface WalkingRatesModalProps {
  isVisible: boolean;
  onClose: () => void;
  onRatesUpdated: () => void;
}

interface WalkingRates {
  ratePerHour: string;
  rateForAdditionalDog: string;
  maxDogs: string;
}

const WalkingRatesModal: React.FC<WalkingRatesModalProps> = ({ 
  isVisible, 
  onClose,
  onRatesUpdated
}) => {
  const [rates, setRates] = useState<WalkingRates>({
    ratePerHour: '',
    rateForAdditionalDog: '',
    maxDogs: '3'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load current rates when modal opens
  useEffect(() => {
    if (isVisible) {
      loadRates();
    }
  }, [isVisible]);
  
  const loadRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }
      
      // Get current rates from database using helper function
      const sitterInfo = await getSitterInfo(user.id);
      
      if (sitterInfo) {
        setRates({
          ratePerHour: sitterInfo.walking_rate_per_hour.toString(),
          rateForAdditionalDog: sitterInfo.walking_rate_for_additional_dog.toString(),
          maxDogs: sitterInfo.max_dogs_walking.toString()
        });
      } else {
        // Set default values if no data exists
        setRates({
          ratePerHour: '0',
          rateForAdditionalDog: '0',
          maxDogs: '3'
        });
      }
    } catch (error) {
      console.log('Error:', error);
      setError('Failed to load rates. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRates = async () => {
    // Reset states
    setError(null);
    setSuccessMessage(null);
    
    // Validate input
    if (!rates.ratePerHour || !rates.rateForAdditionalDog || !rates.maxDogs) {
      setError('Please fill in all fields');
      return;
    }
    
    // Validate rates are numbers
    const ratePerHour = parseFloat(rates.ratePerHour);
    const rateForAdditionalDog = parseFloat(rates.rateForAdditionalDog);
    const maxDogs = parseInt(rates.maxDogs);
    
    if (isNaN(ratePerHour) || isNaN(rateForAdditionalDog) || isNaN(maxDogs)) {
      setError('Rates must be valid numbers');
      return;
    }
    
    // Validate rates are positive
    if (ratePerHour < 0 || rateForAdditionalDog < 0 || maxDogs < 1) {
      setError('Rates must be positive and max dogs must be at least 1');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }
      
      // Update rates in database using helper function
      const updatedInfo = await updateWalkingRates(
        user.id, 
        ratePerHour, 
        rateForAdditionalDog, 
        maxDogs
      );
      
      const error = updatedInfo ? null : new Error('Failed to update walking rates');
      
      if (error) {
        setError('Failed to update rates: ' + error.message);
        return;
      }
      
      // Show success message
      setSuccessMessage('Walking rates updated successfully!');
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Walking rates updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Walking rates updated successfully!');
      }
      
      // Notify parent component
      onRatesUpdated();
      
      // Close modal after a short delay
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.log('Error updating rates:', error);
      setError('Failed to update rates. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    // Reset state
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    onClose();
  };
  
  const handleInputChange = (field: keyof WalkingRates, value: string) => {
    setRates(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 120} // Increased Android offset
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Walking Rates 1233</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#62C6B9" />
              <Text style={styles.loadingText}>Loading rates...</Text>
            </View>
          ) : (
            <>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              {successMessage && (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rate per Hour ($)</Text>
                <TextInput
                  style={styles.input}
                  value={rates.ratePerHour}
                  onChangeText={(value) => handleInputChange('ratePerHour', value)}
                  placeholder="25.00"
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rate for Additional Dog ($)</Text>
                <TextInput
                  style={styles.input}
                  value={rates.rateForAdditionalDog}
                  onChangeText={(value) => handleInputChange('rateForAdditionalDog', value)}
                  placeholder="10.00"
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Maximum Dogs</Text>
                <TextInput
                  style={styles.input}
                  value={rates.maxDogs}
                  onChangeText={(value) => handleInputChange('maxDogs', value)}
                  placeholder="3"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                />
              </View>
              
              <Text style={styles.rateInfo}>
                These rates will be visible to dog owners when they book your services.
              </Text>
              
              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleUpdateRates}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Update Rates</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center', // Center the modal vertically
    alignItems: 'center',     // Center the modal horizontally
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
  },
  scrollViewContent: {
    flexGrow: 1, // Ensure ScrollView content can grow
    justifyContent: 'center', // Center content within ScrollView
    alignItems: 'center',
    width: '100%', // Ensure ScrollView takes full width for centering modalView
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '80%',
    maxWidth: 400,
    paddingVertical: 20,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    fontFamily: 'Inter-Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#F9F9F9',
  },
  rateInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#62C6B9',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: '#A8DEDA',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});

export default WalkingRatesModal;
