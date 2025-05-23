import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import GroomingAvailabilityManager from './GroomingAvailabilityManager';
import { useAuthStore } from '../../store/useAuthStore';
import { useAvailabilityStore } from '../../store/useAvailabilityStore';

interface GroomingAvailabilityManagerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAvailabilityUpdated: () => void;
}

const GroomingAvailabilityManagerModal = ({
  isVisible,
  onClose,
  onAvailabilityUpdated
}: GroomingAvailabilityManagerModalProps) => {
  const user = useAuthStore(state => state.user);
  const { fetchAvailability, setAvailability, isLoading, error, availability } = useAvailabilityStore();
  const [forceShowEmpty, setForceShowEmpty] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // Handle modal visibility changes
  useEffect(() => {
    if (isVisible) {
      console.log('GroomingAvailabilityModal: Modal became visible - preparing to load data');
      hasLoadedRef.current = false;
      setForceShowEmpty(false);
      
      // Set timeout to force show empty state if loading takes too long
      timeoutRef.current = setTimeout(() => {
        console.log('GroomingAvailabilityModal: Loading timeout reached - forcing empty state');
        setForceShowEmpty(true);
        setAvailability({
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        });
      }, 3000);
      
      // Load data when modal becomes visible
      if (user?.id) {
        console.log('GroomingAvailabilityModal: Fetching availability for user', user.id);
        hasLoadedRef.current = true;
        fetchAvailability(user.id)
          .then(() => {
            console.log('GroomingAvailabilityModal: Data fetch completed successfully');
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setForceShowEmpty(true);
          })
          .catch(err => {
            console.log('GroomingAvailabilityModal: Error fetching data', err);
            setForceShowEmpty(true);
          });
      } else {
        console.warn('GroomingAvailabilityModal: No user ID available for fetching data');
        setForceShowEmpty(true);
      }
    } else {
      // Modal is closing, clean up timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
    
    // Clean up on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, user?.id]);

  const handleClose = () => {
    console.log('GroomingAvailabilityModal: Closing modal');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };
  
  const handleAvailabilityUpdated = () => {
    console.log('GroomingAvailabilityModal: Availability updated');
    onAvailabilityUpdated();
    onClose();
  };

  const handleForceEmpty = () => {
    setForceShowEmpty(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setAvailability({
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    });
  };

  const showEmptyView = () => {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="schedule" size={64} color="#62C6B9" />
        <Text style={styles.emptyTitle}> Grooming Schedule </Text>
        <Text style={styles.emptyDescription}>
          Set up your grooming availability to let pet owners know when you're available for appointments.
        </Text>
        <GroomingAvailabilityManager 
          onAvailabilityUpdated={handleAvailabilityUpdated} 
        />
      </View>
    );
  };

  const shouldShowEmptyState = forceShowEmpty || 
    (!isLoading && (!availability || Object.values(availability).every(slots => slots.length === 0)));
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <SafeAreaView style={styles.container}>
            {isLoading && !forceShowEmpty ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#62C6B9" />
                <Text style={styles.loadingText}>Loading your grooming schedule...</Text>
                
                <TouchableOpacity 
                  style={[styles.skipButton, { marginTop: 30 }]}
                  onPress={handleForceEmpty}
                >
                  <Text style={styles.skipButtonText}>Skip Loading</Text>
                </TouchableOpacity>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color="#f44336" />
                <Text style={styles.errorTitle}>Error Loading Schedule</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    if (user?.id) {
                      fetchAvailability(user.id);
                    }
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.contentContainer}>
                {shouldShowEmptyState ? (
                  showEmptyView()
                ) : (
                  <GroomingAvailabilityManager
                    onAvailabilityUpdated={handleAvailabilityUpdated}
                  />
                )}
              </View>
            )}
          </SafeAreaView>
          
          <View style={styles.bottomIndicator} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    padding: 20,
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
  },
  dragIndicator: {
    width: 60,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyDescription: {
    marginTop: 8,
    marginBottom: 32,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#62C6B9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#888',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  },
  closeButton: {
    padding: 5,
  },
  bottomIndicator: {
    width: 60,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    position: 'absolute',
    bottom: 10,
  },
});

export default GroomingAvailabilityManagerModal; 