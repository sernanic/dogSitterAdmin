import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Collapsible from 'react-native-collapsible';
import { useAuthStore } from '../../store/useAuthStore';
import { useAvailabilityStore } from '../../store/useAvailabilityStore';
import { 
  TimeSlot, 
  formatTimeToAMPM, 
  checkTimeSlotOverlap,
  validateTimeSlot,
  sortTimeSlots
} from '../../lib/availability';

interface DayAvailability {
  day: string;
  isCollapsed: boolean;
  timeSlots: TimeSlot[];
}

interface GroomingAvailabilityManagerProps {
  onAvailabilityUpdated: () => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday', 
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

// Grooming-specific time presets (typical grooming appointment slots)
const GROOMING_PRESET_SLOTS = [
  { label: 'Early Morning', value: { start: '08:00', end: '10:00' } },
  { label: 'Morning', value: { start: '10:00', end: '12:00' } },
  { label: 'Early Afternoon', value: { start: '12:00', end: '14:00' } },
  { label: 'Afternoon', value: { start: '14:00', end: '16:00' } },
  { label: 'Late Afternoon', value: { start: '16:00', end: '18:00' } }
];

const GroomingAvailabilityManager = ({ 
  onAvailabilityUpdated
}: GroomingAvailabilityManagerProps) => {
  const user = useAuthStore(state => state.user);
  const { 
    availability, 
    setAvailability, 
    saveAvailability, 
    fetchAvailability,
    isLoading
  } = useAvailabilityStore();
  
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [currentEditingSlot, setCurrentEditingSlot] = useState<{day: string, slotId: string | null}>({
    day: '',
    slotId: null
  });
  
  const [dayAvailability, setDayAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map(day => ({
      day,
      isCollapsed: true,
      timeSlots: []
    }))
  );

  // Additional state for Android time picker
  const [androidTimePickerVisible, setAndroidTimePickerVisible] = useState(false);

  // Load availability data from backend
  useEffect(() => {
    if (user?.id) {
      fetchAvailability(user.id);
    }
  }, [user?.id]);

  // Update local state when store availability changes
  useEffect(() => {
    if (availability) {
      const updatedDayAvailability = DAYS_OF_WEEK.map(day => {
        const daySlots = availability[day.toLowerCase()] || [];
        return {
          day,
          isCollapsed: day !== expandedDay,
          timeSlots: daySlots.map((slot: any) => ({
            id: slot.id || `${Math.random().toString(36).substring(2, 9)}`,
            start: slot.start,
            end: slot.end
          }))
        };
      });
      setDayAvailability(updatedDayAvailability);
    }
  }, [availability]);

  const toggleDay = (day: string) => {
    setExpandedDay(prev => (prev === day ? null : day));
  };

  const addTimeSlot = (day: string, start = '09:00', end = '17:00') => {
    const newSlot: TimeSlot = {
      id: `${Math.random().toString(36).substring(2, 9)}`,
      start,
      end
    };

    const updatedDayAvailability = dayAvailability.map(dayItem => {
      if (dayItem.day === day) {
        const existingSlots = dayItem.timeSlots;
        
        // Check for overlaps with existing slots
        const overlapResult = checkTimeSlotOverlap(existingSlots, newSlot);
        
        if (overlapResult && typeof overlapResult === 'object' && overlapResult.isOverlapping) {
          Alert.alert('Overlap Detected', 'This time slot overlaps with an existing slot. Please choose a different time.');
          return dayItem;
        }

        // Validate the new slot
        const validationError = validateTimeSlot(newSlot);
        if (validationError) {
          Alert.alert('Invalid Time Slot', validationError);
          return dayItem;
        }

        const newSlots = [...existingSlots, newSlot];
        return {
          ...dayItem,
          timeSlots: sortTimeSlots(newSlots)
        };
      }
      return dayItem;
    });

    setDayAvailability(updatedDayAvailability);
  };

  const removeTimeSlot = (day: string, slotId: string) => {
    const updatedDayAvailability = dayAvailability.map(dayItem => {
      if (dayItem.day === day) {
        return {
          ...dayItem,
          timeSlots: dayItem.timeSlots.filter(slot => slot.id !== slotId)
        };
      }
      return dayItem;
    });

    setDayAvailability(updatedDayAvailability);
  };

  const updateTimeSlot = (day: string, slotId: string, data: Partial<TimeSlot>) => {
    const updatedDayAvailability = dayAvailability.map(dayItem => {
      if (dayItem.day === day) {
        const updatedSlots = dayItem.timeSlots.map(slot => {
          if (slot.id === slotId) {
            const updatedSlot = { ...slot, ...data };
            
            // Validate the updated slot
            const validationError = validateTimeSlot(updatedSlot);
            if (validationError) {
              Alert.alert('Invalid Time', validationError);
              return slot; // Return original slot if validation fails
            }

            // Check for overlaps with other slots (excluding current slot)
            const otherSlots = dayItem.timeSlots.filter(s => s.id !== slotId);
            const overlapResult = checkTimeSlotOverlap(otherSlots, updatedSlot);
            
            if (overlapResult && typeof overlapResult === 'object' && overlapResult.isOverlapping) {
              Alert.alert('Overlap Detected', 'This time change would create an overlap with another slot.');
              return slot; // Return original slot if overlap detected
            }

            return updatedSlot;
          }
          return slot;
        });

        return {
          ...dayItem,
          timeSlots: sortTimeSlots(updatedSlots)
        };
      }
      return dayItem;
    });

    setDayAvailability(updatedDayAvailability);
  };

  const handleSaveAvailability = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }

    try {
      // Convert dayAvailability to the format expected by the API
      const availabilityData: Record<string, TimeSlot[]> = {};
      
      dayAvailability.forEach(dayItem => {
        const dayKey = dayItem.day.toLowerCase();
        availabilityData[dayKey] = dayItem.timeSlots;
      });

      // Save to store first
      setAvailability(availabilityData);
      
      // Then save to backend
      const success = await saveAvailability(user.id, availabilityData);
      
      if (success) {
        Alert.alert('Success', 'Your grooming schedule has been saved successfully!');
        onAvailabilityUpdated();
      } else {
        Alert.alert('Error', 'Failed to save your grooming schedule. Please try again.');
      }
    } catch (error) {
      console.log('Error saving grooming availability:', error);
      Alert.alert('Error', 'Failed to save your grooming schedule. Please try again.');
    }
  };

  const openTimePicker = (day: string, slotId: string | null, mode: 'start' | 'end') => {
    const dayData = dayAvailability.find(d => d.day === day);
    const slot = slotId ? dayData?.timeSlots.find(s => s.id === slotId) : null;
    
    let timeToShow = new Date();
    if (slot) {
      const timeString = mode === 'start' ? slot.start : slot.end;
      const [hours, minutes] = timeString.split(':').map(Number);
      timeToShow.setHours(hours, minutes, 0, 0);
    }

    setCurrentEditingSlot({ day, slotId });
    setTimePickerMode(mode);
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
    }

    if (selectedTime && event.type !== 'dismissed') {
      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentEditingSlot.slotId) {
        // Update existing slot
        updateTimeSlot(
          currentEditingSlot.day,
          currentEditingSlot.slotId,
          { [timePickerMode]: timeString }
        );
      } else {
        // This shouldn't happen in grooming mode, but handle gracefully
        console.log('Unexpected state: trying to update time without slot ID');
      }
    }

    if (Platform.OS === 'ios') {
      setShowTimePicker(false);
    }
  };

  const formatTime = (time: string) => formatTimeToAMPM(time);

  const addPredefinedSlot = (day: string, preset: { start: string, end: string }) => {
    addTimeSlot(day, preset.start, preset.end);
  };

  const renderDayItem = ({ item }: { item: DayAvailability }) => (
    <View style={styles.dayContainer}>
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={() => toggleDay(item.day)}
      >
        <Text style={styles.dayText}>{item.day}</Text>
        <View style={styles.dayHeaderRight}>
          <Text style={styles.slotsCountText}>
            {item.timeSlots.length} appointment slot{item.timeSlots.length !== 1 ? 's' : ''}
          </Text>
          <MaterialCommunityIcons
            name={item.isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={24}
            color="#666"
          />
        </View>
      </TouchableOpacity>
      
      <Collapsible collapsed={item.day !== expandedDay}>
        <View style={styles.dayContent}>
          {/* Preset appointment slots for grooming */}
          <Text style={styles.presetTitle}>Quick Add Appointment Slots:</Text>
          <ScrollView 
            horizontal 
            style={styles.presetContainer}
            showsHorizontalScrollIndicator={false}
          >
            {GROOMING_PRESET_SLOTS.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={styles.presetButton}
                onPress={() => addPredefinedSlot(item.day, preset.value)}
              >
                <Text style={styles.presetButtonText}>{preset.label}</Text>
                <Text style={styles.presetTimeText}>
                  {formatTime(preset.value.start)} - {formatTime(preset.value.end)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.addSlotButton}
            onPress={() => addTimeSlot(item.day)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#62C6B9" />
            <Text style={styles.addSlotText}>Add Custom Appointment Slot</Text>
          </TouchableOpacity>
          
          {/* Time slots list */}
          {item.timeSlots.map((slot, index) => (
            <View key={slot.id} style={styles.timeSlotItem}>
              <View style={styles.timeSlotContent}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker(item.day, slot.id, 'start')}
                >
                  <Text style={styles.timeButtonText}>{formatTime(slot.start)}</Text>
                </TouchableOpacity>
                
                <Text style={styles.timeSeparator}>to</Text>
                
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker(item.day, slot.id, 'end')}
                >
                  <Text style={styles.timeButtonText}>{formatTime(slot.end)}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeTimeSlot(item.day, slot.id)}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#f44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {item.timeSlots.length === 0 && (
            <Text style={styles.noSlotsText}>
              No appointment slots set for {item.day}. Add slots to let customers book grooming appointments.
            </Text>
          )}
        </View>
      </Collapsible>
    </View>
  );

  return (
    <View style={styles.container}>

      
      <FlatList
        data={dayAvailability}
        renderItem={renderDayItem}
        keyExtractor={(item) => item.day}
        style={styles.daysList}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveAvailability}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Grooming Schedule'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Time picker for iOS */}
      {Platform.OS === 'ios' && showTimePicker && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={styles.timePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>
              Select {timePickerMode === 'start' ? 'Start' : 'End'} Time
            </Text>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleTimeChange}
            style={styles.timePicker}
          />
        </View>
      )}
      
      {/* Time picker for Android */}
      {Platform.OS === 'android' && androidTimePickerVisible && (
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
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  daysList: {
    flex: 1,
  },
  dayContainer: {
    backgroundColor: 'white',
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fafafa',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotsCountText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  dayContent: {
    padding: 16,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  presetContainer: {
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#e8f5f3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#62C6B9',
    marginBottom: 2,
  },
  presetTimeText: {
    fontSize: 10,
    color: '#666',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#62C6B9',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  addSlotText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#62C6B9',
    fontWeight: '500',
  },
  timeSlotItem: {
    marginBottom: 8,
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f9f8',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#62C6B9',
  },
  timeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 70,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeSeparator: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
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
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timePickerCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timePickerDone: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  timePicker: {
    backgroundColor: 'white',
  },
});

export default GroomingAvailabilityManager; 