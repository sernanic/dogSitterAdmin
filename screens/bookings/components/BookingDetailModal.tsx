import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking
} from 'react-native';
import { X, Mail, Calendar, Clock, MapPin, DollarSign, User, Phone } from 'lucide-react-native'; // Added User, Phone
import { Booking, Pet, UserAddress } from '../../../types'; // Adjust path as needed
import { router } from 'expo-router';

interface BookingDetailModalProps {
  visible: boolean;
  onClose: () => void;
  onCompleteBooking: () => void; // New prop for completing booking
  booking: Booking | null;
  formatDate: (dateString: string) => string;
  formatPetsList: (booking: Booking, petsMap: { [key: string]: Pet }) => string;
  petsMap: { [key: string]: Pet };
  showCompleteButton: boolean; // New prop to control button visibility
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  visible,
  onClose,
  onCompleteBooking,
  booking,
  formatDate,
  formatPetsList,
  petsMap,
  showCompleteButton,
}) => {
  if (!booking) {
    return null; // Don't render anything if no booking is selected
  }

  const { owner, address } = booking;
  const bookingPets = formatPetsList(booking, petsMap);
  const bookingDate = formatDate(booking.booking_date);
  const startTime = booking.start_time?.slice(0, 5) || 'N/A';
  const endTime = booking.end_time?.slice(0, 5) || 'N/A';

  const handleMessageOwner = () => {
    if (owner) {
        console.log(`Attempting to navigate to chat with owner ID: ${owner.id}`);
        router.push({ pathname: '/messages/conversation', params: { recipientId: owner.id } });
        onClose(); // Close modal after navigating
    } else {
        console.log("Cannot message owner: Owner data not available.");
        // Optionally show an alert to the user
    }
  };

  // Basic function to attempt making a call (implement with actual logic if needed)
  const handleCallOwner = () => {
    // Assuming owner object might have a phone number field like 'phoneNumber'
    // const phoneNumber = owner?.phoneNumber;
    // if (phoneNumber) {
    //   Linking.openURL(`tel:${phoneNumber}`);
    // } else {
    //   alert('Phone number not available.');
    // }
    alert('Call functionality not yet implemented.'); 
  };
  
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
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6C757D" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={[styles.modalStatusContainer, getStatusStyle(booking.status)]}>
               <Text style={[styles.statusTextBase, getStatusTextStyle(booking.status)]}>
                 Status: {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
               </Text>
            </View>

            {/* Owner Info Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Owner Information</Text>
              {owner ? (
                <View style={styles.modalOwnerInfo}>
                  <Image
                    source={{
                      uri: owner.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(owner.name || 'Owner')
                    }}
                    style={styles.modalOwnerImage}
                  />
                  <View style={styles.ownerDetailsText}>
                    <Text style={styles.modalOwnerName}>{owner.name || 'Owner Name'}</Text>
                    {address && (
                      <Text style={styles.modalOwnerAddress}>
                        {address.formatted_address || `${address.city}, ${address.state}` || 'Address not available'}
                      </Text>
                    )}
                    {/* Placeholder for email/phone - add if available in UserProfile */}
                    {/* <Text style={styles.modalOwnerContact}>owner.email@example.com</Text> */}
                  </View>
                   {/* Action Buttons - Refined Layout */}
                  <View style={styles.ownerActionsContainer}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleMessageOwner}>
                       <Mail size={24} color="#63C7B8" />
                    </TouchableOpacity>
                     {/* <TouchableOpacity style={styles.iconButton} onPress={handleCallOwner}>
                       <Phone size={24} color="#63C7B8" />
                    </TouchableOpacity> */} 
                  </View>
                </View>
              ) : (
                <Text style={styles.infoText}>Owner details not available.</Text>
              )}
            </View>

            {/* Booking Details Section */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Booking Details</Text>
                <View style={styles.detailItem}>
                    <Calendar size={18} color="#6C757D" style={styles.detailIcon} />
                    <Text style={styles.detailText}>{bookingDate}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Clock size={18} color="#6C757D" style={styles.detailIcon} />
                    <Text style={styles.detailText}>{startTime} - {endTime}</Text>
                </View>
                <View style={styles.detailItem}>
                    <DollarSign size={18} color="#6C757D" style={styles.detailIcon} />
                    <Text style={styles.detailText}>Total: ${booking.total_price || 'N/A'}</Text>
                </View>
                {booking.notes && (
                    <View style={styles.detailItem}> 
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{booking.notes}</Text>
                    </View>
                )}
            </View>

            {/* Pet Details Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Pets</Text>
              {booking.pets && booking.pets.length > 0 ? (
                booking.pets.map((pet) => (
                  <View key={pet.id} style={styles.petItemContainer}>
                    <Image 
                      source={{ uri: pet.image_url || 'https://placehold.co/100x100/EFEFEF/AAAAAA&text=No+Image' }} 
                      style={styles.petImage} 
                    />
                    <View style={styles.petDetailsText}>
                      <Text style={styles.petName}>{pet.name || 'Unnamed Pet'}</Text>
                      <Text style={styles.petInfo}>{pet.breed || 'Unknown Breed'} - {pet.gender || 'N/A'}, {pet.age || 'N/A'} yrs</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.infoText}>{bookingPets}</Text> // Shows 'No pets specified' or IDs if map failed
              )}
            </View>

          </ScrollView>
           {/* Optional: Footer Buttons (e.g., Cancel Booking) */}
          <View style={styles.modalButtonContainer}>
             {/* Show Complete button only if applicable */}
            {showCompleteButton && (
              <TouchableOpacity style={styles.modalActionButton} onPress={onCompleteBooking}>
                <Text style={styles.modalButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add styles moved from BookingsScreen and new styles
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
    padding: 20,
    paddingTop: 15, // Reduce top padding slightly
    maxHeight: '90%', // Increase max height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF', // Lighter border
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20, // Slightly smaller
    fontWeight: '600', // Semi-bold
    color: '#343A40',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    // Style for the scroll view area if needed
  },
  modalStatusContainer: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  statusTextBase: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  pendingBackground: { backgroundColor: '#FFF3CD' },
  upcomingBackground: { backgroundColor: '#D1ECF1' },
  completedBackground: { backgroundColor: '#D4EDDA' },
  cancelledBackground: { backgroundColor: '#F8D7DA' },
  pendingText: { color: '#856404' },
  upcomingText: { color: '#0C5460' },
  completedText: { color: '#155724' },
  cancelledText: { color: '#721C24' },
  sectionContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 15,
  },
  modalOwnerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top
  },
  modalOwnerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
   ownerDetailsText: {
    flex: 1, // Take remaining space
    justifyContent: 'center',
  },
  modalOwnerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 4,
  },
  modalOwnerAddress: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 4,
    lineHeight: 18,
  },
  modalOwnerContact: {
    fontSize: 14,
    color: '#6C757D',
  },
   ownerActionsContainer: {
    flexDirection: 'row',
    marginLeft: 10, // Space between text and icons
  },
   iconButton: {
    padding: 8,
    marginLeft: 5,
    // Add background/border if desired
    // backgroundColor: '#F8F9FA',
    // borderRadius: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 12,
    width: 18, // Ensure icons align nicely
    textAlign: 'center',
  },
  detailText: {
    fontSize: 15,
    color: '#495057',
    flex: 1, // Allow text to wrap
  },
   notesLabel: {
    fontWeight: '600',
    color: '#495057',
    marginRight: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#6C757D',
    flex: 1,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic',
  },
  petItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#E9ECEF', // Placeholder background
  },
  petDetailsText: {
    flex: 1,
  },
  petName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 3,
  },
  petInfo: {
    fontSize: 13,
    color: '#6C757D',
  },
  // Modal Button Styles (Optional - Moved here)
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the single button
    paddingTop: 15,
    paddingBottom: 15, // More padding at the bottom
    paddingHorizontal: 20, // Add horizontal padding to container
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff', // Ensure background for container
  },
  modalActionButton: { // Renamed from modalCompleteButton
    backgroundColor: '#63C7B8', // Use app's primary color
    paddingVertical: 12, // Slightly more vertical padding
    paddingHorizontal: 30,
    borderRadius: 8,
    alignSelf: 'stretch', // Make button stretch to container padding
    alignItems: 'center', // Center text horizontally
  },
  modalButtonText: { // Shared style for button text
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default BookingDetailModal;
