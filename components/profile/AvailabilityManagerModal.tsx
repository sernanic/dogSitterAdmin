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
  Alert,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AvailabilityManager from './AvailabilityManager';
import { useAvailabilityStore } from '../../store/useAvailabilityStore';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  debugAvailabilityTables, 
  getDirectSitterAvailability, 
  fetchUserBoardingAvailability,
  boardingDatesToDateArray,
  saveUserBoardingAvailability
} from '../../lib/availability';

interface AvailabilityManagerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAvailabilityUpdated: () => void;
}

type AvailabilityTab = 'walking' | 'boarding';

const AvailabilityManagerModal = ({
  isVisible,
  onClose,
  onAvailabilityUpdated
}: AvailabilityManagerModalProps) => {
  const user = useAuthStore(state => state.user);
  const { fetchAvailability, setAvailability, isLoading, error, availability } = useAvailabilityStore();
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  // Add local state to force show the empty state
  const [forceShowEmpty, setForceShowEmpty] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // New state for tab selection and boarding availability
  const [activeTab, setActiveTab] = useState<AvailabilityTab>('walking');
  const [boardingDates, setBoardingDates] = useState<Date[]>([]);
  const [loadingBoardingDates, setLoadingBoardingDates] = useState(false);
  const [boardingError, setBoardingError] = useState<string | null>(null);

  // FIRST useEffect: Only handle modal visibility changes
  useEffect(() => {
    // When modal becomes visible, reset states
    if (isVisible) {
      console.log('Modal became visible - preparing to load data');
      hasLoadedRef.current = false;
      setForceShowEmpty(false);
    } else {
      // Modal is closing, clean up timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isVisible]);

  // SECOND useEffect: Handle data loading ONCE when needed
  useEffect(() => {
    // Only load data if:
    // 1. Modal is visible
    // 2. We have a user ID
    // 3. We haven't loaded yet OR user manually requested a retry
    if (isVisible && user?.id && (!hasLoadedRef.current || loadAttempts > 0)) {
      console.log('Loading data - attempt:', loadAttempts);
      
      // Mark that we've attempted to load
      hasLoadedRef.current = true;
      
      // Set timeout to force show empty state after delay
      timeoutRef.current = setTimeout(() => {
        if (isLoading) {
          console.log('Loading timeout reached - forcing empty state');
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
        }
      }, 5000);
      
      // Load the data
      fetchAvailability(user.id);
      loadBoardingAvailability(user.id);
    }
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, user?.id, loadAttempts]);
  
  // Load boarding availability data
  const loadBoardingAvailability = async (userId: string) => {
    try {
      setLoadingBoardingDates(true);
      setBoardingError(null);
      
      const boardingDatesData = await fetchUserBoardingAvailability(userId);
      const dateArray = boardingDatesToDateArray(boardingDatesData);
      
      console.log(`Loaded ${dateArray.length} boarding dates`);
      setBoardingDates(dateArray);
    } catch (error: any) {
      console.error('Error loading boarding availability:', error);
      setBoardingError(error.message || 'Failed to load boarding availability');
    } finally {
      setLoadingBoardingDates(false);
    }
  };
  
  // Save boarding availability
  const saveBoardingAvailability = async (dates: Date[]) => {
    if (!user?.id) return;
    
    try {
      setLocalLoading(true);
      const result = await saveUserBoardingAvailability(user.id, dates);
      
      if (result.success) {
        Alert.alert('Success', 'Your boarding availability has been updated!');
        // Call the parent's callback to refresh data
        onAvailabilityUpdated();
      } else {
        Alert.alert('Error', result.error || 'Failed to save boarding availability');
      }
    } catch (error: any) {
      console.error('Error saving boarding availability:', error);
      Alert.alert('Error', error.message || 'An error occurred while saving');
    } finally {
      setLocalLoading(false);
    }
  };
  
  const handleClose = () => {
    // Clean up and close
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };
  
  const handleAvailabilityUpdated = () => {
    // Call the parent's callback
    onAvailabilityUpdated();
    // Close modal after successful update if desired
    onClose();
  };

  const handleRetry = () => {
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Reset loading state
    setForceShowEmpty(false);
    setLoadAttempts(prev => prev + 1);
  };
  
  const handleDebug = async () => {
    if (user?.id) {
      setLocalLoading(true);
      console.log('Starting availability debug...');
      try {
        const result = await debugAvailabilityTables(user.id);
        console.log('Debug complete:', result);
        
        Alert.alert(
          'Debug Results', 
          'Debug info logged to console.',
          [{ text: 'OK' }]
        );
        
        // Try direct load without using store to avoid potential loops
        try {
          console.log('Loading data directly...');
          const directResult = await getDirectSitterAvailability(user.id);
          console.log('Direct data loaded:', directResult);
          
          if (!directResult.error) {
            setAvailability(directResult.data || {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: []
            });
            
            // Always show UI after direct load
            setForceShowEmpty(true);
            
            Alert.alert(
              'Data Loaded', 
              'Availability data loaded successfully.',
              [{ text: 'OK' }]
            );
          }
        } catch (e) {
          console.error('Direct load failed:', e);
        }
      } catch (e) {
        console.error('Debug failed:', e);
        Alert.alert('Debug Failed', 'Check console for details.', [{ text: 'OK' }]);
      } finally {
        setLocalLoading(false);
      }
    } else {
      Alert.alert('Error', 'No user ID available for debugging', [{ text: 'OK' }]);
    }
  };
  
  const handleForceEmpty = () => {
    // Stop any loading
    setForceShowEmpty(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Initialize empty availability
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
        <MaterialIcons name="event-available" size={64} color="#007AFF" />
        <Text style={styles.emptyTitle}>No Availability Set</Text>
        <Text style={styles.emptyDescription}>
          {activeTab === 'walking' ? 
            "You haven't set up your walking availability yet. Use the tools below to add your available time slots." :
            "You haven't set up your boarding availability yet. Use the calendar below to select days you're available for boarding."
          }
        </Text>
        {activeTab === 'walking' ? (
          <AvailabilityManager 
            onAvailabilityUpdated={handleAvailabilityUpdated} 
            mode="walking"
          />
        ) : (
          <AvailabilityManager 
            onAvailabilityUpdated={handleAvailabilityUpdated}
            mode="boarding"
            boardingDates={boardingDates}
            onBoardingDatesChanged={saveBoardingAvailability}
          />
        )}
      </View>
    );
  };
  
  // Render tab selector
  const renderTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'walking' && styles.activeTab]}
          onPress={() => setActiveTab('walking')}
        >
          <MaterialIcons 
            name="directions-walk" 
            size={24} 
            color={activeTab === 'walking' ? "#007AFF" : "#777"} 
          />
          <Text style={[styles.tabText, activeTab === 'walking' && styles.activeTabText]}>
            Walking
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'boarding' && styles.activeTab]}
          onPress={() => setActiveTab('boarding')}
        >
          <MaterialIcons 
            name="home" 
            size={24} 
            color={activeTab === 'boarding' ? "#007AFF" : "#777"} 
          />
          <Text style={[styles.tabText, activeTab === 'boarding' && styles.activeTabText]}>
            Boarding
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Show empty state if forced or if no data and not loading
  const shouldShowEmptyState = forceShowEmpty || 
    (!isLoading && !localLoading && (!availability || Object.values(availability).every(slots => slots.length === 0)));
  
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
            <Text style={styles.modalTitle}>Set Your Availability</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <SafeAreaView style={styles.container}>
            {isLoading && !forceShowEmpty && activeTab === 'walking' ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading your walking availability...</Text>
                
                <TouchableOpacity 
                  style={[styles.skipButton, { marginTop: 30 }]}
                  onPress={handleForceEmpty}
                >
                  <Text style={styles.skipButtonText}>Skip Loading</Text>
                </TouchableOpacity>
              </View>
            ) : loadingBoardingDates && !forceShowEmpty && activeTab === 'boarding' ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading your boarding availability...</Text>
                
                <TouchableOpacity 
                  style={[styles.skipButton, { marginTop: 30 }]}
                  onPress={handleForceEmpty}
                >
                  <Text style={styles.skipButtonText}>Skip Loading</Text>
                </TouchableOpacity>
              </View>
            ) : (error && !forceShowEmpty && activeTab === 'walking') || (boardingError && !forceShowEmpty && activeTab === 'boarding') ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color="#f44336" />
                <Text style={styles.errorText}>Failed to load availability</Text>
                <Text style={styles.errorDescription}>{activeTab === 'walking' ? error : boardingError}</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.retryButton} 
                    onPress={handleRetry}
                  >
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.debugButton} 
                    onPress={handleDebug}
                  >
                    <Text style={styles.debugText}>Debug</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[styles.continueButton, { marginTop: 20 }]}
                  onPress={handleForceEmpty}
                >
                  <Text style={styles.continueText}>Continue Without Loading</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.contentContainer}>
                {renderTabs()}
                
                {shouldShowEmptyState ? (
                  showEmptyView()
                ) : (
                  activeTab === 'walking' ? (
                    <AvailabilityManager 
                      onAvailabilityUpdated={handleAvailabilityUpdated} 
                      mode="walking"
                    />
                  ) : (
                    <AvailabilityManager 
                      onAvailabilityUpdated={handleAvailabilityUpdated}
                      mode="boarding"
                      boardingDates={boardingDates}
                      onBoardingDatesChanged={saveBoardingAvailability}
                    />
                  )
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTab: {
    backgroundColor: '#e0f0ff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#777',
  },
  activeTabText: {
    color: '#007AFF',
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
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
  },
  errorDescription: {
    marginTop: 8,
    marginBottom: 24,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: 8,
  },
  debugText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  continueText: {
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

export default AvailabilityManagerModal; 