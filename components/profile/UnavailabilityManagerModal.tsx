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
import UnavailabilityManager from './UnavailabilityManager';
import { useAuthStore } from '../../store/useAuthStore';
import { useUnavailabilityStore } from '../../store/useUnavailabilityStore';
import { supabase } from '../../lib/supabase';

interface UnavailabilityManagerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUnavailabilityUpdated: () => void;
}

const UnavailabilityManagerModal = ({
  isVisible,
  onClose,
  onUnavailabilityUpdated
}: UnavailabilityManagerModalProps) => {
  const user = useAuthStore(state => state.user);
  const { isLoading, error, clearUnavailability, fetchUnavailability, setUnavailability } = useUnavailabilityStore();
  const [forceShowEmpty, setForceShowEmpty] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      console.log('UnavailabilityModal: Modal became visible');
      setForceShowEmpty(false);
      setHasAttemptedLoad(false);
      
      // Set a timeout to force show empty state if loading takes too long
      timeoutRef.current = setTimeout(() => {
        console.log('UnavailabilityModal: Loading timeout reached - forcing empty state');
        setForceShowEmpty(true);
        setUnavailability({});
      }, 3000);
      
      // Load data when modal becomes visible
      if (user?.id) {
        console.log('UnavailabilityModal: Fetching data for user', user.id);
        setHasAttemptedLoad(true);
        fetchUnavailability(user.id)
          .then(() => {
            console.log('UnavailabilityModal: Data fetch completed successfully');
            // Clear the timeout since we loaded successfully
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setForceShowEmpty(true);
          })
          .catch(err => {
            console.error('UnavailabilityModal: Error fetching data', err);
            // Force show the empty state on error
            setForceShowEmpty(true);
          });
      } else {
        console.warn('UnavailabilityModal: No user ID available for fetching data');
        // Force show empty state if no user ID
        setForceShowEmpty(true);
      }
    } else {
      console.log('UnavailabilityModal: Modal became hidden');
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
  
  // Debug loading and error states
  useEffect(() => {
    if (isVisible) {
      console.log('UnavailabilityModal: Loading state =', isLoading);
      
      // If we've started loading and then stopped, ensure we're showing content
      if (hasAttemptedLoad && !isLoading) {
        console.log('UnavailabilityModal: Loading complete, clearing timeout and showing content');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setForceShowEmpty(true);
      }
      
      if (error) {
        console.error('UnavailabilityModal: Error =', error);
      }
    }
  }, [isVisible, isLoading, error, hasAttemptedLoad]);
  
  const handleClose = () => {
    console.log('UnavailabilityModal: Closing modal');
    // Clean up timeout before closing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };
  
  const handleUnavailabilityUpdated = () => {
    console.log('UnavailabilityModal: Unavailability updated');
    // Call the parent's callback
    onUnavailabilityUpdated();
    // Close modal after successful update
    onClose();
  };

  const handleRetry = () => {
    console.log('UnavailabilityModal: Retrying data fetch');
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Reset loading state
    setForceShowEmpty(false);
    
    if (user?.id) {
      fetchUnavailability(user.id);
    } else {
      console.warn('UnavailabilityModal: Cannot retry - no user ID');
    }
  };
  
  const handleForceEmpty = () => {
    console.log('UnavailabilityModal: Forcing empty state');
    // Stop any loading
    setForceShowEmpty(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Initialize empty unavailability
    setUnavailability({});
  };

  const handleDebugDatabase = async () => {
    console.log('UnavailabilityModal: Debugging database tables');
    
    if (!user?.id) {
      console.warn('UnavailabilityModal: No user ID available for debugging');
      Alert.alert('Error', 'No user ID available for debugging');
      return;
    }
    
    try {
      // Check if the table exists
      const { count, error } = await supabase
        .from('sitter_unavailability')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error('UnavailabilityModal: Error checking table:', error);
        
        if (error.code === '42P01') { // undefined_table
          Alert.alert(
            'Database Error',
            'The sitter_unavailability table does not exist. Please run the SQL script to create it.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Database Error',
            `Error checking table: ${error.message}`,
            [{ text: 'OK' }]
          );
        }
        return;
      }
      
      console.log(`UnavailabilityModal: Table exists, found ${count} total records`);
      
      // Try to query for this specific user
      const { data, error: userError } = await supabase
        .from('sitter_unavailability')
        .select('*')
        .eq('sitter_id', user.id);
      
      if (userError) {
        console.error('UnavailabilityModal: Error querying user data:', userError);
        Alert.alert(
          'Database Error',
          `Error querying user data: ${userError.message}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log(`UnavailabilityModal: Found ${data?.length || 0} records for user ${user.id}`);
      
      Alert.alert(
        'Database Check',
        `Table exists with ${count} total records. You have ${data?.length || 0} unavailable dates.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('UnavailabilityModal: Debug error:', error);
      Alert.alert(
        'Debug Error',
        `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Determine when to show content vs loading state
  // Show content if we're not loading OR we've forced empty state
  const shouldShowContent = !isLoading || forceShowEmpty;

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
            <Text style={styles.modalTitle}>Set Your Unavailability</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <SafeAreaView style={styles.container}>
            {isLoading && !forceShowEmpty ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading unavailability data...</Text>
                
                <View style={styles.debugButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleForceEmpty}
                  >
                    <Text style={styles.actionButtonText}>Skip Loading</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.debugButton]}
                    onPress={handleDebugDatabase}
                  >
                    <Text style={styles.actionButtonText}>Check Database</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : error && !forceShowEmpty ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color="#f44336" />
                <Text style={styles.errorTitle}>Error Loading Unavailability</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={handleRetry}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <UnavailabilityManager onUnavailabilityUpdated={handleUnavailabilityUpdated} />
            )}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    height: '95%',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f44336',
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
    minWidth: 200,
  },
  actionButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  debugButton: {
    borderColor: '#ff9500', // Orange for debug
  },
  debugButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});

export default UnavailabilityManagerModal; 