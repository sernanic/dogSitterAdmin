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
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../../store/useAuthStore';
import { useAvailabilityStore } from '../../store/useAvailabilityStore';
import { 
  TimeSlot, 
  DayAvailability as DayAvailabilityType, 
  formatTimeToAMPM, 
  checkTimeSlotOverlap,
  validateTimeSlot,
  sortTimeSlots,
  isDateInArray,
  addDateToArray,
  removeDateFromArray,
  checkDayHasUnavailability
} from '../../lib/availability';
import { format, addMonths } from 'date-fns';

interface DayAvailability {
  day: string;
  isCollapsed: boolean;
  timeSlots: TimeSlot[];
}

type AvailabilityMode = 'walking' | 'boarding';

interface AvailabilityManagerProps {
  onAvailabilityUpdated: () => void;
  mode?: AvailabilityMode;
  boardingDates?: Date[];
  onBoardingDatesChanged?: (dates: Date[]) => void;
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

const PREDEFINED_SLOTS = [
  { label: 'Morning', value: { start: '08:00', end: '12:00' } },
  { label: 'Afternoon', value: { start: '12:00', end: '16:00' } },
  { label: 'Evening', value: { start: '16:00', end: '19:00' } }
];

const AvailabilityManager = ({ 
  onAvailabilityUpdated,
  mode = 'walking',
  boardingDates = [],
  onBoardingDatesChanged = () => {}
}: AvailabilityManagerProps) => {
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
  
  // Boarding availability state
  const [selectedBoardingDates, setSelectedBoardingDates] = useState<Date[]>(boardingDates || []);
  const [calendarMarkedDates, setCalendarMarkedDates] = useState<Record<string, any>>({});
  
  const [dayAvailability, setDayAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map(day => ({
      day,
      isCollapsed: true,
      timeSlots: []
    }))
  );

  // Additional state for Android time picker
  const [androidTimePickerVisible, setAndroidTimePickerVisible] = useState(false);

  // Add state to track which slots were modified
  const [modifiedSlots, setModifiedSlots] = useState<Record<string, Set<string>>>({});

  // Add another state to track new slots
  const [newSlots, setNewSlots] = useState<Record<string, Set<string>>>({});

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

  // Update boardingDates state when passed from props
  useEffect(() => {
    if (boardingDates && mode === 'boarding') {
      setSelectedBoardingDates(boardingDates);
      updateCalendarMarks(boardingDates);
    }
  }, [boardingDates, mode]);
  
  // Update calendar marked dates whenever selected dates change
  const updateCalendarMarks = (dates: Date[]) => {
    const markedDates: Record<string, any> = {};
    
    // Add all selected dates
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      markedDates[dateStr] = {
        selected: true,
        selectedColor: '#62C6B9',
      };
    });
    
    setCalendarMarkedDates(markedDates);
  };
  
  // Handle boarding date selection
  const handleDateSelect = async (date: any) => {
    try {
      const [year, month, day] = date.dateString.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      
      // Check if date is already in unavailability table
      if (user?.id) {
        const hasUnavailability = await checkDayHasUnavailability(user.id, selectedDate);
        
        if (hasUnavailability) {
          Alert.alert(
            'Date Unavailable', 
            'This date is marked as unavailable in your calendar. Please select a different date.'
          );
          return;
        }
      }
      
      // Toggle the selection
      let newDates;
      if (isDateInArray(selectedDate, selectedBoardingDates)) {
        newDates = removeDateFromArray(selectedDate, selectedBoardingDates);
      } else {
        newDates = addDateToArray(selectedDate, selectedBoardingDates);
      }
      
      setSelectedBoardingDates(newDates);
      updateCalendarMarks(newDates);
    } catch (error) {
      console.log('Error selecting date:', error);
      Alert.alert('Error', 'Failed to select date. Please try again.');
    }
  };

  const toggleDay = (day: string) => {
    setExpandedDay(prev => (prev === day ? null : day));
  };

  const addTimeSlot = (day: string, start = '09:00', end = '19:00') => {
    // Enforce only one time range per day for walking mode
    if (mode === 'walking') {
      const existingSlots = dayAvailability.find(d => d.day === day)?.timeSlots || [];
      if (existingSlots.length >= 1) {
        Alert.alert('One Time Range Only', 'You can only have one time range per day for walking.');
        return;
      }
    }

    const newSlot = {
      id: Math.random().toString(36).substring(2, 9),
      start,
      end
    };

    // Validate the new slot
    const validationError = validateTimeSlot(newSlot);
    if (validationError) {
      Alert.alert('Invalid Time Slot', validationError);
      return;
    }

    setDayAvailability(prev => 
      prev.map(d => {
        if (d.day === day) {
          // Check for overlapping slots
          const overlapResult = checkTimeSlotOverlap(d.timeSlots, newSlot);
          
          if (overlapResult) {
            // Handle detailed overlap information
            if (typeof overlapResult === 'boolean') {
              Alert.alert('Time Slot Overlap', 'This time slot overlaps with an existing slot.');
            } else {
              // We have detailed overlap information
              const overlappingSlot = overlapResult.overlappingWith;
              Alert.alert(
                'Time Slot Overlap',
                `This time slot overlaps with an existing slot: ${formatTimeToAMPM(overlappingSlot.start)} - ${formatTimeToAMPM(overlappingSlot.end)}`
              );
            }
            return d;
          }

          // Mark this as a new slot
          const daySet = new Set(newSlots[day] || []);
          daySet.add(newSlot.id);
          setNewSlots(prev => ({
            ...prev,
            [day]: daySet
          }));

          const updatedSlots = [...d.timeSlots, newSlot];
          return {
            ...d,
            timeSlots: sortTimeSlots(updatedSlots)
          };
        }
        return d;
      })
    );
  };

  const removeTimeSlot = (day: string, slotId: string) => {
    // Remove from tracking if it's a modified or new slot
    if (modifiedSlots[day]?.has(slotId)) {
      const updatedModified = new Set(modifiedSlots[day]);
      updatedModified.delete(slotId);
      setModifiedSlots(prev => ({
        ...prev,
        [day]: updatedModified
      }));
    }
    
    if (newSlots[day]?.has(slotId)) {
      const updatedNew = new Set(newSlots[day]);
      updatedNew.delete(slotId);
      setNewSlots(prev => ({
        ...prev,
        [day]: updatedNew
      }));
    }
    
    // Remove the slot from day availability
    setDayAvailability(prev => 
      prev.map(d => {
        if (d.day === day) {
          return {
            ...d,
            timeSlots: d.timeSlots.filter(slot => slot.id !== slotId)
          };
        }
        return d;
      })
    );
  };

  const updateTimeSlot = (day: string, slotId: string, data: Partial<TimeSlot>) => {
    setDayAvailability(prev => 
      prev.map(d => {
        if (d.day === day) {
          const updatedSlots = d.timeSlots.map(slot => {
            if (slot.id === slotId) {
              const updatedSlot = { ...slot, ...data };
              
              // Validate the updated slot
              const validationError = validateTimeSlot(updatedSlot);
              if (validationError) {
                Alert.alert('Invalid Time Slot', validationError);
                return slot; // Keep the original slot if validation fails
              }

              // Check for overlaps with other slots
              const otherSlots = d.timeSlots.filter(s => s.id !== slotId);
              const overlapResult = checkTimeSlotOverlap(otherSlots, updatedSlot);
              
              if (overlapResult) {
                // Now overlapResult can be either a boolean or an object with overlap details
                if (typeof overlapResult === 'boolean') {
                  Alert.alert('Time Slot Overlap', 'This time slot overlaps with an existing slot.');
                } else {
                  // We have detailed overlap information
                  const overlappingSlot = overlapResult.overlappingWith;
                  Alert.alert(
                    'Time Slot Overlap',
                    `This time slot overlaps with an existing slot: ${formatTimeToAMPM(overlappingSlot.start)} - ${formatTimeToAMPM(overlappingSlot.end)}`
                  );
                }
                return slot; // Keep the original slot if there's an overlap
              }

              // Mark the slot as modified by tracking it
              const daySet = new Set(modifiedSlots[day] || []);
              daySet.add(slotId);
              setModifiedSlots(prev => ({
                ...prev,
                [day]: daySet
              }));

              return updatedSlot;
            }
            return slot;
          });

          return {
            ...d,
            timeSlots: sortTimeSlots(updatedSlots)
          };
        }
        return d;
      })
    );
  };

  // Update the getSlotStyle and getSlotStatusText functions to handle new slots
  const getSlotStyle = (day: string, slotId: string) => {
    // Check if this slot is marked as modified or new
    const isModified = modifiedSlots[day]?.has(slotId);
    const isNew = newSlots[day]?.has(slotId);
    
    if (isNew) {
      return {...styles.timeSlot, borderLeftColor: '#4CAF50'};  // Green for new
    } else if (isModified) {
      return {...styles.timeSlot, borderLeftColor: '#FFA726'};  // Orange for modified
    } else {
      return styles.timeSlot;  // Default style
    }
  };

  const getSlotStatusText = (day: string, slotId: string) => {
    // Check if this slot is marked as modified or new
    if (newSlots[day]?.has(slotId)) {
      return ' (New)';
    } else if (modifiedSlots[day]?.has(slotId)) {
      return ' (Edited)';
    } else {
      return '';
    }
  };

  const handleSaveAvailability = async () => {
    if (!user?.id) return;
    
    try {
      // Different save logic depending on mode
      if (mode === 'walking') {
        // Convert to format expected by backend
        const formattedAvailability = DAYS_OF_WEEK.reduce((acc, day) => {
          const dayData = dayAvailability.find(d => d.day === day);
          // Sort time slots before saving
          const slots = dayData?.timeSlots || [];
          acc[day.toLowerCase()] = sortTimeSlots(slots);
          return acc;
        }, {} as Record<string, TimeSlot[]>);

        // The saveAvailability function in the store will handle setting isLoading
        const result = await saveAvailability(user.id, formattedAvailability);
        
        if (result.success) {
          Alert.alert(
            "Success",
            "Your walking availability has been updated successfully!",
            [{ text: "OK" }]
          );
          onAvailabilityUpdated();
        } else {
          // Check if the error is about overlapping slots
          if (result.error && result.error.includes('overlaps')) {
            Alert.alert(
              "Time Slot Overlap Error",
              "Please check your time slots for overlaps. Make sure no time slots overlap with each other.",
              [{ text: "OK" }]
            );
          } else {
            Alert.alert(
              "Error",
              result.error || "Failed to save your availability. Please try again.",
              [{ text: "OK" }]
            );
          }
        }
      } else {
        // Boarding mode - use the onBoardingDatesChanged callback
        console.log('Saving boarding dates:', selectedBoardingDates);
        onBoardingDatesChanged(selectedBoardingDates);
        Alert.alert(
          "Success",
          "Your boarding availability has been updated successfully!",
          [{ text: "OK" }]
        );
        onAvailabilityUpdated();
      }
    } catch (error) {
      console.log("Error saving availability:", error);
      Alert.alert(
        "Error",
        "Failed to save your availability. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const openTimePicker = (day: string, slotId: string | null, mode: 'start' | 'end') => {
    setTimePickerMode(mode);
    setCurrentEditingSlot({ day, slotId });

    // Set initial time
    let initialTime = new Date();
    initialTime.setHours(9);
    initialTime.setMinutes(0);
    
    if (slotId) {
      const dayData = dayAvailability.find(d => d.day === day);
      const slot = dayData?.timeSlots.find(s => s.id === slotId);
      
      if (slot) {
        const [hours, minutes] = mode === 'start' 
          ? slot.start.split(':').map(Number)
          : slot.end.split(':').map(Number);
          
        initialTime.setHours(hours);
        initialTime.setMinutes(minutes);
      }
    }
    
    setSelectedTime(initialTime);
    
    // Platform-specific time picker display
    if (Platform.OS === 'ios') {
      setShowTimePicker(true);
    } else {
      // For Android, show the time picker dialog
      setAndroidTimePickerVisible(true);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    // For iOS, hide the time picker after selection
    if (Platform.OS === 'ios') {
      setShowTimePicker(false);
    } else {
      // For Android, hide the time picker dialog
      setAndroidTimePickerVisible(false);
    }

    // Exit if dismissed (Android only)
    if (event.type === 'dismissed') {
      return;
    }

    // If no time was selected, exit
    if (!selectedTime) return;
    
    const currentTime = selectedTime;
    setSelectedTime(currentTime);
    
    const { day, slotId } = currentEditingSlot;
    if (!day) return;
    
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    if (slotId) {
      updateTimeSlot(day, slotId, {
        [timePickerMode]: timeString
      });
    } else {
      // Creating a new slot
      const newSlot = {
        id: Math.random().toString(36).substring(2, 9),
        start: timePickerMode === 'start' ? timeString : '09:00',
        end: timePickerMode === 'end' ? timeString : '19:00'
      };
      
      setDayAvailability(prev => 
        prev.map(d => {
          if (d.day === day) {
            return {
              ...d,
              timeSlots: [...d.timeSlots, newSlot]
            };
          }
          return d;
        })
      );
      
      // Update for continuing edit of the new slot
      setCurrentEditingSlot({ day, slotId: newSlot.id });
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
        <MaterialCommunityIcons 
          name={expandedDay === item.day ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#666"
        />
      </TouchableOpacity>
      
      <Collapsible collapsed={expandedDay !== item.day}>
        <View style={styles.dayContent}>
          {/* Predefined slots */}
          <View style={styles.predefinedSlotsContainer}>
            <Text style={styles.sectionSubtitle}>Quick Options:</Text>
            <View style={styles.predefinedSlots}>
              {PREDEFINED_SLOTS.map(preset => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.predefinedSlotButton}
                  onPress={() => addPredefinedSlot(item.day, preset.value)}
                >
                  <Text style={styles.predefinedSlotText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Custom time slots */}
          <View style={styles.timeSlotsContainer}>
            <View style={styles.timeSlotsHeader}>
              <Text style={styles.sectionSubtitle}>Your Time Slot:</Text>
              {!(mode === 'walking' && item.timeSlots.length >= 1) && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => openTimePicker(item.day, null, 'start')}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="white" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {item.timeSlots.length === 0 ? (
              <Text style={styles.emptyText}>
                No time slots added yet. Use the quick options above or add custom slots.
              </Text>
            ) : (
              <View style={styles.timeSlotsList}>
                {item.timeSlots.map(slot => (
                  <View key={slot.id} style={getSlotStyle(item.day, slot.id)}>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => openTimePicker(item.day, slot.id, 'start')}
                    >
                      <Text style={styles.timeText}>{formatTime(slot.start)}</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.timeConnector}>to</Text>
                    
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => openTimePicker(item.day, slot.id, 'end')}
                    >
                      <Text style={styles.timeText}>{formatTime(slot.end)}</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.statusText}>
                      {getSlotStatusText(item.day, slot.id)}
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => removeTimeSlot(item.day, slot.id)}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Collapsible>
    </View>
  );
  
  // Render the calendar view for boarding availability
  const renderBoardingCalendar = () => {
    const today = new Date();
    const maxDate = addMonths(today, 3); // Allow bookings 3 months in advance
    
    return (
      <View style={styles.calendarContainer}>
        <Text style={styles.calendarTitle}>Select Days Available for Boarding</Text>
        <Text style={styles.calendarSubtitle}>Tap on dates to mark them as available for boarding</Text>
        
        <Calendar
          minDate={today.toISOString().split('T')[0]}
          maxDate={maxDate.toISOString().split('T')[0]}
          onDayPress={handleDateSelect}
          markedDates={calendarMarkedDates}
          theme={{
            selectedDayBackgroundColor: '#62C6B9',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#62C6B9',
            textDayFontWeight: '400',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '400',
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14
          }}
          // Fix for the nested VirtualizedLists warning
          disableScrollToMonth={true}
        />
        
        <View style={styles.calendarLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#62C6B9' }]} />
            <Text style={styles.legendText}>Available for Boarding</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f0f0f0' }]} />
            <Text style={styles.legendText}>Not Available</Text>
          </View>
        </View>
        
        <View style={styles.selectedDatesContainer}>
          <Text style={styles.selectedDatesTitle}>
            {selectedBoardingDates.length} Day{selectedBoardingDates.length !== 1 ? 's' : ''} Selected
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {mode === 'walking' ? (
        <>
          <FlatList
            data={dayAvailability}
            renderItem={renderDayItem}
            keyExtractor={item => item.day}
            contentContainerStyle={styles.listContent}
          />
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveAvailability}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Walking Availability'}
            </Text>
          </TouchableOpacity>
          
          {/* Platform specific time picker rendering */}
          {Platform.OS === 'ios' && showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={handleTimeChange}
            />
          )}

          {/* Android time picker - only show when needed */}
          {Platform.OS === 'android' && androidTimePickerVisible && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </>
      ) : (
        <>
          {renderBoardingCalendar()}
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveAvailability}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Boarding Availability'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDatesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
  },
  selectedDatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 80,
  },
  dayContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  predefinedSlotsContainer: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  predefinedSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  predefinedSlotButton: {
    backgroundColor: '#e6f0fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  predefinedSlotText: {
    color: '#62C6B9',
    fontSize: 14,
  },
  timeSlotsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
  },
  timeSlotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#62C6B9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 14,
  },
  timeSlotsList: {
    marginTop: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    minWidth: 110,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  timeConnector: {
    marginHorizontal: 12,
    color: '#666',
    fontSize: 14,
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: 10,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#62C6B9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#FFA726',
    marginLeft: 4,
  },
});

export default AvailabilityManager; 