import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { Booking, Pet, UserProfile } from '../../../types'; // Adjust path as needed

interface BookingListItemProps {
  item: Booking;
  onPress: (booking: Booking) => void;
  formatDate: (dateString: string) => string; 
  formatPetsList: (booking: Booking, petsMap: { [key: string]: Pet }) => string;
  petsMap: { [key: string]: Pet }; // Pass the petsMap down
}

const BookingListItem: React.FC<BookingListItemProps> = ({ item, onPress, formatDate, formatPetsList, petsMap }) => {
  const { owner } = item; // Enriched booking includes owner
  // const address = item.address; // Address is also available if needed
  const bookingPets = formatPetsList(item, petsMap); // Format pet names using the passed map
  const bookingDate = formatDate(item.booking_date);
  const startTime = item.start_time?.slice(0, 5) || 'N/A';
  const endTime = item.end_time?.slice(0, 5) || 'N/A';

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return styles.pendingBackground;
      case 'confirmed': return styles.upcomingBackground;
      case 'completed': return styles.completedBackground;
      case 'cancelled': return styles.cancelledBackground;
      default: return {};
    }
  };
  
   const getStatusTextStyle = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return styles.pendingText;
      case 'confirmed': return styles.upcomingText;
      case 'completed': return styles.completedText;
      case 'cancelled': return styles.cancelledText;
      default: return {};
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress(item)} style={styles.bookingCard}>
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: owner?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner?.name || 'O') }}
          style={styles.ownerImage}
        />
        <View style={styles.headerText}>
          <Text style={styles.ownerName}>{owner?.name || 'Owner Name Missing'}</Text>
          <Text style={styles.bookingPets}>{bookingPets}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusTextBase, getStatusTextStyle(item.status)]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Calendar size={16} color="#6C757D" />
          <Text style={styles.detailText}>{bookingDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={16} color="#6C757D" />
          <Text style={styles.detailText}>{startTime} - {endTime}</Text>
        </View>
        {/* Optionally add address info if needed */}
        {/* {address && (
          <View style={styles.detailRow}>
            <MapPin size={16} color="#6C757D" />
            <Text style={styles.detailText}>{address.formatted_address || `${address.city}, ${address.state}`}</Text>
          </View>
        )} */}
      </View>
      {/* Footer can be added if needed */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  ownerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#eee',
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 2,
  },
  bookingPets: {
    fontSize: 14,
    color: '#6C757D',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  // Base text style for status
  statusTextBase: {
    fontWeight: 'bold',
    fontSize: 12, // Slightly smaller for badge
  },
  // Specific background colors
  pendingBackground: { backgroundColor: '#FFF3CD' }, // Yellowish
  upcomingBackground: { backgroundColor: '#D1ECF1' }, // Light Blue
  completedBackground: { backgroundColor: '#D4EDDA' }, // Light Green
  cancelledBackground: { backgroundColor: '#F8D7DA' }, // Light Red
  // Specific text colors matching backgrounds
  pendingText: { color: '#856404' }, // Dark Yellow
  upcomingText: { color: '#0C5460' }, // Dark Blue
  completedText: { color: '#155724' }, // Dark Green
  cancelledText: { color: '#721C24' }, // Dark Red
  cardBody: {
    // marginBottom: 15, // Remove if no footer
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#495057',
    flexShrink: 1,
  },
});

export default BookingListItem;
