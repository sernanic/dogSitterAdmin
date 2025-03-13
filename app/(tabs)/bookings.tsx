import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, DollarSign, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../../store/useAuthStore';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  image_url?: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface Address {
  id: string;
  formatted_address: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
}

interface Booking {
  id: string;
  owner_id: string;
  sitter_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  selected_pets: string; // JSON string of pet IDs
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_price: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: Profile;
  address?: Address;
  pets?: Pet[];
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<{[key: string]: Profile}>({});
  const [addresses, setAddresses] = useState<{[key: string]: Address}>({});
  const [pets, setPets] = useState<{[key: string]: Pet}>({});
  
  // Get the current authenticated user
  const { user, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, activeTab]);
  
  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Determine the status to filter based on the active tab
      const statusFilter = activeTab === 'upcoming' 
        ? ['pending', 'confirmed'] 
        : ['completed', 'cancelled'];
      
      // Fetch bookings for the sitter with the right status
      const { data: bookingsData, error } = await supabase
        .from('walking_bookings')
        .select('*')
        .eq('sitter_id', user.id)
        .in('status', statusFilter)
        .order(activeTab === 'upcoming' ? 'booking_date' : 'booking_date', { ascending: activeTab === 'upcoming' });
        
      if (error) throw error;
      
      if (bookingsData) {
        // Get unique owner IDs to fetch profiles
        const ownerIds = [...new Set(bookingsData.map(booking => booking.owner_id))];
        
        // Fetch owner profiles
        const { data: ownerProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ownerIds);
          
        if (profilesError) throw profilesError;
        
        // Create a map of owner profiles
        const ownersMap: {[key: string]: Profile} = {};
        ownerProfiles?.forEach(profile => {
          ownersMap[profile.id] = profile;
        });
        setOwners(ownersMap);
        
        // Extract all pet IDs from bookings
        const petIds: string[] = [];
        bookingsData.forEach(booking => {
          try {
            const selectedPets = JSON.parse(booking.selected_pets);
            if (Array.isArray(selectedPets)) {
              petIds.push(...selectedPets);
            }
          } catch (e) {
            console.error('Error parsing pets:', e);
          }
        });
        
        if (petIds.length > 0) {
          // Fetch pet details
          const { data: petsData, error: petsError } = await supabase
            .from('pets')
            .select('*')
            .in('id', [...new Set(petIds)]);
            
          if (petsError) throw petsError;
          
          // Create a map of pets
          const petsMap: {[key: string]: Pet} = {};
          petsData?.forEach(pet => {
            petsMap[pet.id] = pet;
          });
          setPets(petsMap);
        }
        
        // Fetch addresses for owners
        const { data: addressesData, error: addressesError } = await supabase
          .from('useraddress')
          .select('*')
          .in('profile_id', ownerIds)
          .eq('is_primary', true);
          
        if (addressesError) throw addressesError;
        
        // Create a map of addresses by owner ID
        const addressesMap: {[key: string]: Address} = {};
        addressesData?.forEach(address => {
          addressesMap[address.profile_id] = address;
        });
        setAddresses(addressesMap);
        
        // Set the bookings data
        setBookings(bookingsData);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format booking pets list as a string
  const formatPetsList = (booking: Booking): string => {
    try {
      const petIds = JSON.parse(booking.selected_pets);
      if (Array.isArray(petIds) && petIds.length > 0) {
        return petIds
          .map(id => pets[id]?.name || 'Unknown')
          .join(', ');
      }
    } catch (e) {
      console.error('Error parsing pet IDs:', e);
    }
    return 'No pets';
  };
  
  // Format booking time range
  const formatTimeRange = (booking: Booking): string => {
    return `${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)}`;
  };
  
  // Get owner's address
  const getOwnerAddress = async (booking: Booking): Promise<string> => {
    try {
      // First check if we already have the address in our state
      if (addresses[booking.owner_id]) {
        const address = addresses[booking.owner_id];
        return `${address.street_address}, ${address.city}, ${address.state}`;
      }
      
      // If not, fetch it from the database
      const { data: addressData, error } = await supabase
        .from('useraddress')
        .select('*')
        .eq('profile_id', booking.owner_id)
        .eq('is_primary', true);
        
      if (error) {
        console.error('Error fetching address:', error);
        return 'Address not available';
      }
      
      // Check if we got any addresses back
      if (addressData && addressData.length > 0) {
        const firstAddress = addressData[0];
        // Store the address in our state for future use
        const newAddresses = {...addresses};
        newAddresses[booking.owner_id] = firstAddress;
        setAddresses(newAddresses);
        
        return `${firstAddress.street_address}, ${firstAddress.city}, ${firstAddress.state}`;
      }
      
      return 'Address not available';
    } catch (e) {
      console.error('Error in getOwnerAddress:', e);
      return 'Address not available';
    }
  };
  
  // Format booking date
  const formatBookingDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  const filteredBookings = viewMode === 'calendar'
    ? bookings.filter(booking => {
        const bookingDate = new Date(booking.booking_date).toDateString();
        return selectedDate.toDateString() === bookingDate;
      })
    : bookings;

  // We're already using filteredBookings from above, which uses real data

  // Component for displaying address to avoid hooks in render functions
  const BookingAddress = ({ booking }: { booking: Booking }) => {
    const [address, setAddress] = useState('Loading address...');
    
    useEffect(() => {
      getOwnerAddress(booking).then(addr => setAddress(addr));
    }, [booking.id]);
    
    return (
      <Text style={styles.bookingDetailText}>{address}</Text>
    );
  };
  
  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity 
      style={styles.bookingCard}
      onPress={() => router.push(`/booking/${item.id}`)}
    >
      <View style={styles.bookingHeader}>
        {/* Show owner avatar or default image */}
        <Image 
          source={{ uri: owners[item.owner_id]?.avatar_url || 'https://placehold.co/100x100/png' }} 
          style={styles.dogImage} 
        />
        <View style={styles.bookingHeaderInfo}>
          <Text style={styles.dogName}>{owners[item.owner_id]?.name || 'Unknown Owner'}</Text>
          <Text style={styles.dogBreed}>{formatPetsList(item)}</Text>
        </View>
        <ChevronRight size={20} color="#8E8E93" />
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.bookingDetailRow}>
          <Calendar size={16} color="#666" />
          <Text style={styles.bookingDetailText}>
            {formatBookingDate(item.booking_date)} • {formatTimeRange(item)}
          </Text>
        </View>
        
        <View style={styles.bookingDetailRow}>
          <MapPin size={16} color="#666" />
          <BookingAddress booking={item} />
        </View>
        
        <View style={styles.bookingDetailRow}>
          <DollarSign size={16} color="#666" />
          <Text style={styles.bookingDetailText}>Walking • ${parseFloat(item.total_price).toFixed(2)}</Text>
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