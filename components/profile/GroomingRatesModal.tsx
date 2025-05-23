import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  Keyboard,
  Animated,
  Dimensions
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase, getGroomingInfo, updateGroomingRates } from '../../lib/supabase';
import { DOG_SIZE_LABELS, DOG_SIZE_DESCRIPTIONS } from '../../constants/serviceTypes';

interface GroomingRatesModalProps {
  isVisible: boolean;
  onClose: () => void;
  onRatesUpdated: () => void;
}

interface GroomingRates {
  smallDogRate: string;
  mediumDogRate: string;
  largeDogRate: string;
}

const GroomingRatesModal: React.FC<GroomingRatesModalProps> = ({ 
  isVisible, 
  onClose,
  onRatesUpdated
}) => {
  const modalPosition = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');
  const [rates, setRates] = useState<GroomingRates>({
    smallDogRate: '',
    mediumDogRate: '',
    largeDogRate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Keyboard listeners setup and modal position animation
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        Animated.timing(modalPosition, {
          toValue: -keyboardHeight / 2,  // Move modal up half the keyboard height
          duration: 250,
          useNativeDriver: true
        }).start();
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(modalPosition, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true
        }).start();
      }
    );
    
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

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
      const groomingInfo = await getGroomingInfo(user.id);
      
      if (groomingInfo) {
        setRates({
          smallDogRate: groomingInfo.small_dog_rate.toString(),
          mediumDogRate: groomingInfo.medium_dog_rate.toString(),
          largeDogRate: groomingInfo.large_dog_rate.toString()
        });
      } else {
        // Set default values if no data exists
        setRates({
          smallDogRate: '0',
          mediumDogRate: '0',
          largeDogRate: '0'
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
    if (!rates.smallDogRate || !rates.mediumDogRate || !rates.largeDogRate) {
      setError('Please fill in all fields');
      return;
    }
    
    // Validate rates are numbers
    const smallDogRate = parseFloat(rates.smallDogRate);
    const mediumDogRate = parseFloat(rates.mediumDogRate);
    const largeDogRate = parseFloat(rates.largeDogRate);
    
    if (isNaN(smallDogRate) || isNaN(mediumDogRate) || isNaN(largeDogRate)) {
      setError('Rates must be valid numbers');
      return;
    }
    
    // Validate rates are positive
    if (smallDogRate < 0 || mediumDogRate < 0 || largeDogRate < 0) {
      setError('Rates must be positive');
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
      const updatedInfo = await updateGroomingRates(
        user.id, 
        smallDogRate, 
        mediumDogRate, 
        largeDogRate
      );
      
      const error = updatedInfo ? null : new Error('Failed to update grooming rates');
      
      if (error) {
        setError('Failed to update rates: ' + error.message);
        return;
      }
      
      // Show success message
      setSuccessMessage('Grooming rates updated successfully!');
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Grooming rates updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Grooming rates updated successfully!');
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
  
  const handleInputChange = (field: keyof GroomingRates, value: string) => {
    setRates(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View 
          style={[
            styles.animatedContainer,
            { transform: [{ translateY: modalPosition }] }
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grooming Rates</Text>
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
                <Text style={styles.label}>Small Dogs ({DOG_SIZE_DESCRIPTIONS.small})</Text>
                <TextInput
                  style={styles.input}
                  value={rates.smallDogRate}
                  onChangeText={(value) => handleInputChange('smallDogRate', value)}
                  placeholder="35.00"
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Medium Dogs ({DOG_SIZE_DESCRIPTIONS.medium})</Text>
                <TextInput
                  style={styles.input}
                  value={rates.mediumDogRate}
                  onChangeText={(value) => handleInputChange('mediumDogRate', value)}
                  placeholder="50.00"
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Large Dogs ({DOG_SIZE_DESCRIPTIONS.large})</Text>
                <TextInput
                  style={styles.input}
                  value={rates.largeDogRate}
                  onChangeText={(value) => handleInputChange('largeDogRate', value)}
                  placeholder="75.00"
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
              </View>
              
              <Text style={styles.rateInfo}>
                These rates will be visible to dog owners when they book your grooming services.
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
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  animatedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: Dimensions.get('window').height * 0.85, // Limit modal height
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 20,
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

export default GroomingRatesModal; 