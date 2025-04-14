import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text, // Re-add Text import
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

// Import centralized types and new components/hook
import { Booking, Pet, UserProfile, UserAddress } from '../../types';
import { useBookingsData } from '../../screens/bookings/hooks/useBookingsData';
import BookingListItem from '../../screens/bookings/components/BookingListItem';
import BookingDetailModal from '../../screens/bookings/components/BookingDetailModal';
import BookingViewToggle from '../../screens/bookings/components/BookingViewToggle';

// Main Screen Component
const BookingsScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  // Use the custom hook for data management
  const { 
    bookings, // Get bookings data
    loading,  // Get loading state
    error,    // Get error state
    formatDate, 
    formatPetsList, 
    pets, // Get pets map from hook
    refetchBookings, // Get refetch function
    updateBookingStatus // Get update function
  } = useBookingsData(['pending', 'confirmed']); // Always fetch pending and confirmed

  // Refetch bookings when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Bookings screen focused, refetching...");
      refetchBookings();
    }, [refetchBookings]) // Depend on the stable refetch function
  );

  // Modal handling functions remain the same
  const handleOpenModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedBooking(null);
  };

  // Handler for completing a booking
  const handleCompleteBooking = async () => {
    if (!selectedBooking) return;

    const updatedBooking = await updateBookingStatus(selectedBooking.id, 'completed');
    if (updatedBooking) {
      console.log(`Booking ${selectedBooking.id} marked as completed.`);
      handleCloseModal(); // Close modal on success
      refetchBookings();  // Refetch to update the lists
    } else {
      // Error handling (optional: show an alert)
      console.error("Failed to update booking status in modal handler.");
      // Alert.alert("Error", "Failed to update booking status.");
    }
  };

  // Render Content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63C7B8" />
        </View>
      );
    }

    if (error) {
      return <Text style={styles.errorText}>Error loading bookings: {error}</Text>;
    }

    if (viewMode === 'list') {
      return (
        <FlatList
          data={bookings} // Use bookings data from hook
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            // Use the new BookingListItem component
            <BookingListItem 
              item={item} 
              onPress={handleOpenModal}
              formatDate={formatDate} // Pass helper functions from hook
              formatPetsList={formatPetsList}
              petsMap={pets as { [key: string]: Pet }} // Pass pets map from hook
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No bookings found.</Text>}
          contentContainerStyle={styles.listContainer}
        />
      );
    } else {
      // Placeholder for Calendar View
      return <Text style={styles.centerText}>Calendar View Not Implemented Yet</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Use the new BookingViewToggle component */}
      <BookingViewToggle viewMode={viewMode} onViewChange={setViewMode} />
      
      {renderContent()}

      {/* Use the new BookingDetailModal component */}
      <BookingDetailModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onCompleteBooking={handleCompleteBooking} // Pass the handler
        booking={selectedBooking}
        formatDate={formatDate} // Pass helpers from hook
        formatPetsList={formatPetsList}
        petsMap={pets as { [key: string]: Pet }} // Pass pets map from hook
        // Only show complete button for upcoming/confirmed bookings
        showCompleteButton={!!selectedBooking && (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending')}
      />
    </SafeAreaView>
  );
};

// Updated StyleSheet - removed styles for moved components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Light background for the whole screen
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 20,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20, // Add padding to list container
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6C757D',
  },
  centerText: { // For calendar placeholder
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6C757D',
  },
});

export default BookingsScreen;