import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAvailabilityStore } from '../store/useAvailabilityStore';
import { useAuthStore } from '../store/useAuthStore';
import AvailabilityManagerModal from '../components/profile/AvailabilityManagerModal';
import { formatTimeToAMPM, TimeSlot } from '../lib/availability';

// Define the days of the week
const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday', 
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const SitterAvailabilityScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const { availability, fetchAvailability, isLoading } = useAvailabilityStore();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Set navigation options
    navigation.setOptions({
      headerTitle: 'My Availability',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="edit" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });

    // Fetch the sitter's availability when component mounts
    if (user?.id) {
      fetchAvailability(user.id);
    }
  }, [user?.id, navigation]);

  const handleAvailabilityUpdated = () => {
    // Refresh the data after an update
    if (user?.id) {
      fetchAvailability(user.id);
    }
    Alert.alert(
      "Availability Updated",
      "Your availability has been successfully updated and saved.",
      [{ text: "OK" }]
    );
  };

  const renderTimeSlots = (day: string) => {
    const dayKey = day.toLowerCase();
    const slots = availability?.[dayKey] || [];

    if (slots.length === 0) {
      return (
        <Text style={styles.noSlotsText}>
          No availability set for this day
        </Text>
      );
    }

    return slots.map((slot: TimeSlot, index: number) => {
      // Ensure we have valid start and end times
      const startTime = slot.start || '00:00';
      const endTime = slot.end || '00:00';
      
      return (
        <View key={slot.id || `slot-${index}`} style={styles.timeSlot}>
          <Text style={styles.timeText}>
            {formatTimeToAMPM(startTime)} - {formatTimeToAMPM(endTime)}
          </Text>
        </View>
      );
    });
  };

  const renderDayItem = ({ item }: { item: string }) => (
    <View key={item} style={styles.dayContainer}>
      <Text style={styles.dayText}>{item}</Text>
      <View style={styles.slotsContainer}>
        {renderTimeSlots(item)}
      </View>
    </View>
  );

  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.heading}>Your Weekly Availability</Text>
      <Text style={styles.subheading}>
        Set the times when you're available to take care of pets. Clients will only be able to book you during these times.
      </Text>
    </View>
  );

  const ListFooterComponent = () => (
    <TouchableOpacity 
      style={styles.editAvailabilityButton}
      onPress={() => setModalVisible(true)}
    >
      <MaterialIcons name="schedule" size={20} color="white" />
      <Text style={styles.editAvailabilityText}>Edit Availability</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading your availability...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={DAYS_OF_WEEK}
        renderItem={renderDayItem}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.content}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
      />

      <AvailabilityManagerModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAvailabilityUpdated={handleAvailabilityUpdated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  headerContainer: {
    marginBottom: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subheading: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  dayContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  slotsContainer: {
    marginTop: 5,
  },
  timeSlot: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  noSlotsText: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 14,
    paddingVertical: 8,
  },
  editAvailabilityButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
  },
  editAvailabilityText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  editButton: {
    marginRight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SitterAvailabilityScreen; 