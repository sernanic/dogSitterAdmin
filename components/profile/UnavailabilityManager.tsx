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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../../store/useAuthStore';
import { useUnavailabilityStore } from '../../store/useUnavailabilityStore';
import { 
  UnavailableTimeSlot,
  DateUnavailability,
  formatDateToString,
  getCurrentDate,
  formatUnavailabilityForCalendar,
  createUnavailabilitySlot,
  validateUnavailabilitySlot,
  checkUnavailabilityOverlap,
  formatTimeToAMPM
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
  
  // State for calendar
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());
  const [markedDates, setMarkedDates] = useState<{[date: string]: any}>({});
  
  // State for time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [currentEditingSlot, setCurrentEditingSlot] = useState<{date: string, slotId: string | null}>({
    date: '',
    slotId: null
  });
  
  // Additional state for Android time picker
  const [androidTimePickerVisible, setAndroidTimePickerVisible] = useState(false);
  
  // For tracking if the component is saving data
  const [isSaving, setIsSaving] = useState(false);

  // Update the marked dates when unavailability changes
  useEffect(() => {
    const newMarkedDates = formatUnavailabilityForCalendar(unavailability);
    
    // Always mark the selected date
    if (selectedDate) {
      newMarkedDates[selectedDate] = {
        ...newMarkedDates[selectedDate],
        selected: true,
        selectedColor: newMarkedDates[selectedDate]?.selectedColor || '#007AFF'
      };
    }
    
    setMarkedDates(newMarkedDates);
  }, [unavailability, selectedDate]);

  // Load unavailability data from backend
  useEffect(() => {
    if (user?.id) {
      console.log('UnavailabilityManager: Fetching unavailability for user', user.id);
      fetchUnavailability(user.id)
        .then(() => {
          console.log('UnavailabilityManager: Unavailability data loaded successfully');
        })
        .catch(err => {
          console.error('UnavailabilityManager: Error loading unavailability data', err);
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

  const handleDateSelect = (date: any) => {
    setSelectedDate(date.dateString);
  };

  const addTimeSlot = (date: string, start = '09:00', end = '17:00') => {
    const newSlot = createUnavailabilitySlot(date, start, end);
    
    // Check for overlaps
    const dateSlots = unavailability[date] || [];
    const overlappingResult = checkUnavailabilityOverlap(dateSlots, newSlot);
    
    if (overlappingResult !== false && typeof overlappingResult === 'object') {
      const { overlappingWith } = overlappingResult;
      Alert.alert(
        'Time Slot Overlap',
        `This time overlaps with an existing slot (${formatTimeToAMPM(overlappingWith.start)} - ${formatTimeToAMPM(overlappingWith.end)}).`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Validate the slot
    const validationError = validateUnavailabilitySlot(newSlot);
    if (validationError) {
      Alert.alert('Invalid Time Slot', validationError);
      return;
    }
    
    setUnavailability({
      ...unavailability,
      [date]: [...(unavailability[date] || []), newSlot]
    });
  };

  const removeTimeSlot = (date: string, slotId: string) => {
    const updatedDateSlots = (unavailability[date] || []).filter((slot: UnavailableTimeSlot) => slot.id !== slotId);
    
    const updatedUnavailability = {
      ...unavailability,
      [date]: updatedDateSlots
    };
    
    // If there are no more slots for this date, remove the date entry
    if (updatedDateSlots.length === 0) {
      delete updatedUnavailability[date];
    }
    
    setUnavailability(updatedUnavailability);
  };

  const updateTimeSlot = (date: string, slotId: string, data: Partial<UnavailableTimeSlot>) => {
    const dateSlots = unavailability[date] || [];
    
    // Find the slot to update
    const slotIndex = dateSlots.findIndex((slot: UnavailableTimeSlot) => slot.id === slotId);
    if (slotIndex === -1) return;
    
    // Create updated slot
    const updatedSlot = {
      ...dateSlots[slotIndex],
      ...data
    };
    
    // Validate the updated slot
    const validationError = validateUnavailabilitySlot(updatedSlot);
    if (validationError) {
      Alert.alert('Invalid Time Slot', validationError);
      return;
    }
    
    // Check for overlaps with other slots
    const otherSlots = dateSlots.filter((slot: UnavailableTimeSlot) => slot.id !== slotId);
    const overlappingResult = checkUnavailabilityOverlap(otherSlots, updatedSlot);
    
    if (overlappingResult !== false && typeof overlappingResult === 'object') {
      const { overlappingWith } = overlappingResult;
      Alert.alert(
        'Time Slot Overlap',
        `This time overlaps with another slot (${formatTimeToAMPM(overlappingWith.start)} - ${formatTimeToAMPM(overlappingWith.end)}).`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Update the slot
    const updatedSlots = [...dateSlots];
    updatedSlots[slotIndex] = updatedSlot;
    
    setUnavailability({
      ...unavailability,
      [date]: updatedSlots
    });
  };

  const openTimePicker = (date: string, slotId: string | null, mode: 'start' | 'end') => {
    // Set current editing information
    setCurrentEditingSlot({ date, slotId });
    setTimePickerMode(mode);
    
    // Parse current time from slot to set in picker
    let timeToShow = new Date();
    
    if (slotId) {
      const dateSlots = unavailability[date] || [];
      const slot = dateSlots.find((s: UnavailableTimeSlot) => s.id === slotId);
      
      if (slot) {
        const timeString = mode === 'start' ? slot.start : slot.end;
        const [hours, minutes] = timeString.split(':').map(Number);
        
        timeToShow = new Date();
        timeToShow.setHours(hours);
        timeToShow.setMinutes(minutes);
      }
    }
    
    setSelectedTime(timeToShow);
    
    if (Platform.OS === 'android') {
      setAndroidTimePickerVisible(true);
    } else {
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setAndroidTimePickerVisible(false);
      if (event.type === 'dismissed' || !selectedTime) return;
    } else {
      setShowTimePicker(false);
    }
    
    const currentTime = selectedTime ?? new Date();
    setSelectedTime(currentTime);
    
    const { date, slotId } = currentEditingSlot;
    if (!date) return;
    
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    if (slotId) {
      updateTimeSlot(date, slotId, {
        [timePickerMode]: timeString
      });
    } else {
      // Creating a new slot
      const newSlot = createUnavailabilitySlot(
        date,
        timePickerMode === 'start' ? timeString : '09:00',
        timePickerMode === 'end' ? timeString : '17:00'
      );
      
      const dateSlots = unavailability[date] || [];
      setUnavailability({
        ...unavailability,
        [date]: [...dateSlots, newSlot]
      });
      
      // Update for continuing edit of the new slot
      setCurrentEditingSlot({ date, slotId: newSlot.id });
    }
  };

  const handleSaveUnavailability = async () => {
    if (!user?.id) {
      console.error('UnavailabilityManager: No user ID found for saving');
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
        console.error('UnavailabilityManager: Save operation failed');
        Alert.alert('Error', 'Failed to save your unavailability data.');
      }
    } catch (error) {
      console.error('UnavailabilityManager: Error saving unavailability', error);
      Alert.alert('Error', 'Failed to save your unavailability data.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string) => formatTimeToAMPM(time);

  const renderTimeSlots = () => {
    const slots = unavailability[selectedDate] || [];
    
    if (slots.length === 0) {
      return (
        <View style={styles.emptySlots}>
          <Text style={styles.emptyText}>No unavailable time slots for this date</Text>
          <Text style={styles.emptySubtext}>
            {Object.keys(unavailability).length === 0 
              ? "You haven't set any unavailable dates yet. Select a date on the calendar and tap 'Add Time Slot'."
              : `Tap 'Add Time Slot' to mark times when you're unavailable on ${selectedDate}`}
          </Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={slots.sort((a: UnavailableTimeSlot, b: UnavailableTimeSlot) => a.start.localeCompare(b.start))}
        keyExtractor={(item: UnavailableTimeSlot) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.timeSlot}>
            <View style={styles.timeInfo}>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => openTimePicker(selectedDate, item.id, 'start')}
              >
                <Text style={styles.timeText}>{formatTime(item.start)}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>-</Text>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => openTimePicker(selectedDate, item.id, 'end')}
              >
                <Text style={styles.timeText}>{formatTime(item.end)}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => removeTimeSlot(selectedDate, item.id)}
            >
              <MaterialCommunityIcons name="delete-outline" size={22} color="#f44336" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.timeSlotListContent}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Calendar Section */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>Select Dates You're Unavailable</Text>
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={markedDates}
          markingType="dot"
          theme={{
            selectedDayBackgroundColor: '#007AFF',
            todayTextColor: '#007AFF',
            arrowColor: '#007AFF',
          }}
          minDate={getCurrentDate()}
          enableSwipeMonths={true}
          hideExtraDays={false}
        />
      </View>
      
      {/* Time Slots Section */}
      <View style={styles.timeSlotsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Unavailable Time Slots</Text>
          <Text style={styles.selectedDate}>{selectedDate}</Text>
        </View>
        
        <View style={styles.timeSlotListContainer}>
          {renderTimeSlots()}
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => openTimePicker(selectedDate, null, 'start')}
        >
          <MaterialCommunityIcons name="plus" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Time Slot</Text>
        </TouchableOpacity>
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
      
      {/* Time Pickers */}
      {showTimePicker && Platform.OS === 'ios' && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={styles.timePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>
              {timePickerMode === 'start' ? 'Start Time' : 'End Time'}
            </Text>
            <TouchableOpacity onPress={() => handleTimeChange({ type: 'set' }, selectedTime)}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleTimeChange}
          />
        </View>
      )}
      
      {androidTimePickerVisible && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
  timeSlotsSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    maxHeight: '45%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedDate: {
    fontSize: 16,
    color: '#666',
  },
  timeSlotListContainer: {
    marginVertical: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  emptySlots: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#007AFF',
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
  timePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    zIndex: 1000,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timePickerCancel: {
    color: '#ff3b30',
    fontSize: 16,
  },
  timePickerDone: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotListContent: {
    paddingBottom: 8,
  },
});

export default UnavailabilityManager; 