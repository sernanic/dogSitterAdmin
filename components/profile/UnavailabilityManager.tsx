import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../../store/useAuthStore';
import { useUnavailabilityStore, SimpleDateUnavailability, MarkedDateData } from '../../store/useUnavailabilityStore';
import { 
  formatDateToString,
  getCurrentDate,
} from '../../lib/unavailability';

const UnavailabilityManager = ({ onUnavailabilityUpdated }: { onUnavailabilityUpdated: () => void }) => {
  const user = useAuthStore(state => state.user);
  const { 
    unavailability, 
    isLoading, 
    error, 
    fetchUnavailability, 
    saveUnavailability, 
    setUnavailability
  } = useUnavailabilityStore();
  
  // For tracking if the component is saving data
  const [isSaving, setIsSaving] = useState(false);

  // Load unavailability data from backend
  useEffect(() => {
    if (user?.id) {
      console.log('UnavailabilityManager: Fetching unavailability for user', user.id);
      fetchUnavailability(user.id)
        .then(() => {
          console.log('UnavailabilityManager: Unavailability data loaded successfully');
        })
        .catch(err => {
          console.log('UnavailabilityManager: Error loading unavailability data', err);
        });
    } else {
      console.warn('UnavailabilityManager: No user ID available for fetching unavailability');
    }
  }, [user?.id]);

  // Log changes to unavailability data
  useEffect(() => {
    console.log('UnavailabilityManager: Unavailability data updated', 
      Object.keys(unavailability).length, 'dates marked unavailable');
  }, [unavailability]);

  // Handle toggling date selection
  const handleDateSelect = (date: any) => {
    const dateString = date.dateString;
    const currentMarkedDates = { ...unavailability }; // Get current state

    if (currentMarkedDates[dateString]?.selected) {
      // Date is currently selected (unavailable), so deselect it (make available)
      delete currentMarkedDates[dateString];
      console.log(`UnavailabilityManager: Making date ${dateString} available`);
    } else {
      // Date is not selected (available), so mark it as unavailable
      currentMarkedDates[dateString] = {
        selected: true,
        selectedColor: '#f44336', // Red for unavailable
        // You could add other react-native-calendars props here if needed
        // marked: true, 
        // dotColor: 'red',
      };
      console.log(`UnavailabilityManager: Marking date ${dateString} unavailable`);
    }

    // Update the store state
    setUnavailability(currentMarkedDates);
  };

  // Keep the save function as it interacts with the store
  const handleSaveUnavailability = async () => {
    if (!user?.id) {
      console.log('UnavailabilityManager: No user ID found for saving');
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }
    
    setIsSaving(true);
    console.log('UnavailabilityManager: Saving unavailability data for user', user.id);
    
    try {
      const success = await saveUnavailability(user.id, unavailability);
      
      if (success) {
        console.log('UnavailabilityManager: Unavailability saved successfully');
        Alert.alert('Success', 'Your unavailability has been saved.');
        
        if (onUnavailabilityUpdated) {
          onUnavailabilityUpdated();
        }
      } else {
        console.log('UnavailabilityManager: Save operation failed');
        Alert.alert('Error', 'Failed to save your unavailability data.');
      }
    } catch (error) {
      console.log('UnavailabilityManager: Error saving unavailability', error);
      Alert.alert('Error', 'Failed to save your unavailability data.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Calendar Section */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>Tap Dates to Toggle Availability</Text>
        <Text style={styles.subTitle}>(Red = Unavailable)</Text>
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={unavailability} // Use the store state directly
          markingType="custom" // Use custom marking to show selectedColor
          theme={{
            selectedDayBackgroundColor: '#007AFF',
            todayTextColor: '#007AFF',
            arrowColor: '#007AFF',
            // Adjust calendar theme as needed for the new marking type
          }}
          minDate={getCurrentDate()}
          enableSwipeMonths={true}
          hideExtraDays={false}
        />
      </View>
      
      {/* Footer with Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveUnavailability}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Unavailability</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    justifyContent: 'space-between',
  },
  calendarSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#62C6B9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UnavailabilityManager;