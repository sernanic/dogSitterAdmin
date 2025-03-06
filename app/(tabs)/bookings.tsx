import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, DollarSign, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';

interface Booking {
  id: string;
  ownerName: string;
  dogName: string;
  dogBreed: string;
  date: string;
  time: string;
  service: string;
  location: string;
  price: string;
  status: 'upcoming' | 'completed';
  image: string;
}

// Mock data for bookings
const bookingsData: Booking[] = [
  {
    id: '1',
    ownerName: 'Sarah Johnson',
    dogName: 'Max',
    dogBreed: 'Golden Retriever',
    date: '2025-06-15',
    time: '2:00 PM - 2:30 PM',
    service: 'Dog Walking',
    location: '123 Park Ave',
    price: '$15',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '2',
    ownerName: 'Michael Chen',
    dogName: 'Bella',
    dogBreed: 'Beagle',
    date: '2025-06-16',
    time: '9:00 AM - 12:00 PM',
    service: 'Home Sitting',
    location: '456 Main St',
    price: '$45',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '3',
    ownerName: 'Emily Wilson',
    dogName: 'Charlie',
    dogBreed: 'Poodle',
    date: '2025-06-14',
    time: '3:00 PM - 4:00 PM',
    service: 'Dog Walking',
    location: '789 Oak Dr',
    price: '$20',
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1575859431774-2e57ed632664?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '4',
    ownerName: 'David Brown',
    dogName: 'Luna',
    dogBreed: 'Labrador',
    date: '2025-06-13',
    time: '10:00 AM - 4:00 PM',
    service: 'Boarding',
    location: '321 Pine St',
    price: '$80',
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?q=80&w=200&auto=format&fit=crop',
  },
];

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filteredBookings = bookingsData.filter(booking => {
    if (viewMode === 'calendar') {
      const bookingDate = new Date(booking.date).toDateString();
      return selectedDate.toDateString() === bookingDate;
    }
    return (activeTab === 'upcoming' && booking.status === 'upcoming') ||
           (activeTab === 'completed' && booking.status === 'completed');
  });

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Image source={{ uri: item.image }} style={styles.dogImage} />
        <View style={styles.bookingHeaderInfo}>
          <Text style={styles.dogName}>{item.dogName}</Text>
          <Text style={styles.dogBreed}>{item.dogBreed}</Text>
        </View>
        <ChevronRight size={20} color="#8E8E93" />
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.bookingDetailRow}>
          <Calendar size={16} color="#666" />
          <Text style={styles.bookingDetailText}>{item.date.replace(/\d{4}-/, '')} • {item.time}</Text>
        </View>
        
        <View style={styles.bookingDetailRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.bookingDetailText}>{item.location}</Text>
        </View>
        
        <View style={styles.bookingDetailRow}>
          <DollarSign size={16} color="#666" />
          <Text style={styles.bookingDetailText}>{item.service} • {item.price}</Text>
        </View>
      </View>
      
      <View style={styles.bookingActions}>
        {item.status === 'upcoming' ? (
          <>
            <TouchableOpacity style={[styles.actionButton, styles.messageButton]}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.actionButton, styles.viewDetailsButton]}>
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              viewMode === 'list' && styles.viewToggleButtonActive
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text 
              style={[
                styles.viewToggleText,
                viewMode === 'list' && styles.viewToggleTextActive
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              viewMode === 'calendar' && styles.viewToggleButtonActive
            ]}
            onPress={() => {
              setViewMode('calendar');
              setShowDatePicker(true);
            }}
          >
            <Text 
              style={[
                styles.viewToggleText,
                viewMode === 'calendar' && styles.viewToggleTextActive
              ]}
            >
              Calendar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' && (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text 
                style={[
                  styles.tabText, 
                  activeTab === 'upcoming' && styles.activeTabText
                ]}
              >
                Upcoming
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
              onPress={() => setActiveTab('completed')}
            >
              <Text 
                style={[
                  styles.tabText, 
                  activeTab === 'completed' && styles.activeTabText
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {viewMode === 'calendar' && showDatePicker && (
        <View style={styles.calendarContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            style={styles.datePicker}
          />
        </View>
      )}

      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.bookingsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {viewMode === 'calendar' 
                ? 'No bookings for this date' 
                : `No ${activeTab} bookings`}
            </Text>
          </View>
        }
      />

      {viewMode === 'calendar' && (
        <TouchableOpacity 
          style={styles.createAvailabilityButton}
          onPress={() => console.log('Create availability')}
        >
          <Text style={styles.createAvailabilityButtonText}>
            Set Availability
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: '#FFF',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  viewToggleTextActive: {
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    paddingVertical: 8,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#62C6B9',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#62C6B9',
  },
  bookingsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dogImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  bookingHeaderInfo: {
    flex: 1,
    marginLeft: 15,
  },
  dogName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dogBreed: {
    fontSize: 14,
    color: '#666',
  },
  bookingDetails: {
    marginBottom: 15,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButton: {
    backgroundColor: '#E8F1FF',
    marginRight: 10,
  },
  messageButtonText: {
    color: '#62C6B9',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#FFF2F2',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  viewDetailsButton: {
    backgroundColor: '#E8F1FF',
  },
  viewDetailsButtonText: {
    color: '#62C6B9',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  calendarContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    alignItems: 'center',
  },
  datePicker: {
    width: '100%',
  },
  createAvailabilityButton: {
    backgroundColor: '#62C6B9',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  createAvailabilityButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});