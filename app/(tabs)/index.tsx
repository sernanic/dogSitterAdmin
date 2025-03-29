import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, DollarSign, Star, Clock, Users, MapPin, Calendar } from 'lucide-react-native';
import { supabase, getSitterStats, getSitterEarnings, SitterStats, SitterEarnings } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

// Interfaces for data types
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



export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    averageRating: 0,
    totalClients: 0,
  });
  const [earningsData, setEarningsData] = useState<SitterEarnings>({
    today: '$0.00',
    thisWeek: '$0.00',
    thisMonth: '$0.00',
    totalEarnings: '$0.00',
    paidInvoicesCount: 0,
    pendingInvoicesCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [owners, setOwners] = useState<{[key: string]: Profile}>({});
  const [pets, setPets] = useState<{[key: string]: Pet}>({});
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  // Get the current authenticated user
  const { user, isAuthenticated } = useAuthStore();

  // Fetch sitter stats from the database
  const fetchSitterStats = async () => {
    if (!user) return;
    
    try {
      setLoadingStats(true);
      const sitterStats = await getSitterStats(user.id);
      
      // Update the stats state with real data
      setStats({
        totalBookings: sitterStats.total_bookings,
        completedBookings: sitterStats.completed_bookings,
        averageRating: parseFloat(sitterStats.average_rating.toFixed(1)),
        totalClients: sitterStats.total_clients,
      });
    } catch (error) {
      console.error('Error fetching sitter stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch sitter earnings from the database
  const fetchSitterEarnings = async () => {
    if (!user) {
      setLoadingEarnings(false);
      return;
    }
    
    try {
      setLoadingEarnings(true);
      const earnings = await getSitterEarnings(user.id);
      setEarningsData(earnings);
    } catch (error) {
      console.error('Error fetching sitter earnings:', error);
      // Set default values on error
      setEarningsData({
        today: '$0.00',
        thisWeek: '$0.00',
        thisMonth: '$0.00',
        totalEarnings: '$0.00',
        paidInvoicesCount: 0,
        pendingInvoicesCount: 0
      });
    } finally {
      setLoadingEarnings(false);
    }
  };

  // Fetch the data when the component loads
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUpcomingBookings();
      fetchSitterStats();
      fetchSitterEarnings();
    } else {
      setLoadingBookings(false);
      setLoadingStats(false);
      setLoadingEarnings(false);
    }
  }, [isAuthenticated, user]);

  // Function to fetch upcoming bookings
  const fetchUpcomingBookings = async () => {
    if (!user) return;
    
    try {
      setLoadingBookings(true);
      
      // Fetch the next 2 upcoming bookings for the sitter
      const { data: bookingsData, error } = await supabase
        .from('walking_bookings')
        .select('*')
        .eq('sitter_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
        .limit(2);
        
      if (error) throw error;
      
      if (bookingsData && bookingsData.length > 0) {
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
        if (ownerProfiles) {
          ownerProfiles.forEach(profile => {
            ownersMap[profile.id] = profile;
          });
        }
        setOwners(ownersMap);
        
        // Extract all pet IDs from bookings
        const petIds: string[] = [];
        bookingsData.forEach(booking => {
          try {
            // Check if it's already a valid array (might be pre-parsed by Supabase)
            if (typeof booking.selected_pets === 'object' && Array.isArray(booking.selected_pets)) {
              const petArray = booking.selected_pets as string[];
              petIds.push(...petArray);
            }
            // Try to parse it as JSON
            else if (typeof booking.selected_pets === 'string') {
              // Make sure it at least looks like a JSON array before parsing
              if (booking.selected_pets.trim().startsWith('[') && booking.selected_pets.trim().endsWith(']')) {
                const selectedPets = JSON.parse(booking.selected_pets) as string[];
                if (Array.isArray(selectedPets)) {
                  petIds.push(...selectedPets);
                }
              } else {
                console.log('Not a JSON array format:', booking.selected_pets);
              }
            }
          } catch (e) {
            console.error('Error parsing pets from booking ID ' + booking.id + ':', e);
            console.log('Raw selected_pets value:', booking.selected_pets);
          }
        });
        
        if (petIds.length > 0) {
          // Fetch pet details - make sure we have unique IDs
          const uniquePetIds = [...new Set(petIds)];
          console.log('Fetching pets with IDs:', uniquePetIds);
          
          // Fetch pet details - attempt to fetch each pet individually to maximize chances of success
          const petsMap: {[key: string]: Pet} = {};
          const fetchPetPromises = uniquePetIds.map(async (petId) => {
            try {
              const { data, error } = await supabase
                .from('pets')
                .select('*')
                .eq('id', petId)
                .single();
                
              if (error) {
                console.error(`Error fetching pet ${petId}:`, error);
              } else if (data) {
                console.log(`Found pet ${petId}:`, data.name);
                petsMap[petId] = data;
              }
            } catch (fetchErr) {
              console.error(`Exception fetching pet ${petId}:`, fetchErr);
            }
          });
          
          // Wait for all pet fetches to complete
          await Promise.all(fetchPetPromises);
          
          // Log the results
          if (Object.keys(petsMap).length === 0) {
            console.warn('No pets found for IDs:', uniquePetIds);
          } else {
            console.log(`Found ${Object.keys(petsMap).length} pets:`, 
              Object.values(petsMap).map(p => p.name));
          }
          
          // Set the pets map
          setPets(petsMap);
        }
        
        // Set the bookings data
        setUpcomingBookings(bookingsData);
      } else {
        // No bookings found
        setUpcomingBookings([]);
      }
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };
  
  // Helper functions for formatting booking data
  const formatPetsList = (booking: Booking): string => {
    try {
      // Check if it's already a valid array (might be pre-parsed by Supabase)
      if (typeof booking.selected_pets === 'object' && Array.isArray(booking.selected_pets)) {
        const petArray = booking.selected_pets as string[];
        if (petArray.length > 0) {
          const petNames = petArray.map((id: string) => {
            const petName = pets[id]?.name;
            if (!petName) {
              console.log(`Pet ${id} not found in pets map:`, Object.keys(pets));
              return 'Loading...';
            }
            return petName;
          });
          return petNames.join(', ');
        }
        return 'No pets';
      }
      
      // Try to parse it as JSON string
      if (typeof booking.selected_pets === 'string') {
        // Make sure it at least looks like a JSON array before parsing
        if (booking.selected_pets.trim().startsWith('[') && booking.selected_pets.trim().endsWith(']')) {
          const petIds = JSON.parse(booking.selected_pets) as string[];
          if (Array.isArray(petIds) && petIds.length > 0) {
            const petNames = petIds.map((id: string) => {
              const petName = pets[id]?.name;
              if (!petName) {
                console.log(`Pet ${id} not found in pets map:`, Object.keys(pets));
                return 'Loading...';
              }
              return petName;
            });
            return petNames.join(', ');
          }
        } else {
          console.log('Not a JSON array format in formatPetsList:', booking.selected_pets);
          return 'Pet info unavailable';
        }
      }
    } catch (e) {
      console.error('Error parsing pet IDs in formatPetsList:', e);
    }
    return 'No pets';
  };
  
  const formatBookingDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  const formatTimeRange = (booking: Booking): string => {
    return `${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)}`;
  };
  
  // Refresh function for pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUpcomingBookings(),
        fetchSitterStats(),
        fetchSitterEarnings()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>Jessica</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#333" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Earnings Section */}
        <View style={styles.earningsCard}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          {loadingEarnings ? (
            <View style={[styles.loadingContainer, { minHeight: 80 }]}>
              <ActivityIndicator size="large" color="#62C6B9" />
            </View>
          ) : (
            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Today</Text>
                <Text style={styles.earningsValue}>{earningsData.today}</Text>
              </View>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>This Week</Text>
                <Text style={styles.earningsValue}>{earningsData.thisWeek}</Text>
              </View>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>This Month</Text>
                <Text style={styles.earningsValue}>{earningsData.thisMonth}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F1FF' }]}>
              <Calendar size={20} color="#62C6B9" />
            </View>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#62C6B9" style={styles.statLoading} />
            ) : (
              <Text style={styles.statValue}>{stats.totalBookings}</Text>
            )}
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF2E8' }]}>
              <CheckCircle size={20} color="#FF8C42" />
            </View>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#FF8C42" style={styles.statLoading} />
            ) : (
              <Text style={styles.statValue}>{stats.completedBookings}</Text>
            )}
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF8E8' }]}>
              <Star size={20} color="#FFB800" />
            </View>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#FFB800" style={styles.statLoading} />
            ) : (
              <Text style={styles.statValue}>{stats.averageRating}</Text>
            )}
            <Text style={styles.statLabel}>Avg. Rating</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8FFF1' }]}>
              <Users size={20} color="#4CAF50" />
            </View>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#4CAF50" style={styles.statLoading} />
            ) : (
              <Text style={styles.statValue}>{stats.totalClients}</Text>
            )}
            <Text style={styles.statLabel}>Clients</Text>
          </View>
        </View>

        {/* Upcoming Bookings Section */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/bookings')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {loadingBookings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#62C6B9" />
            </View>
          ) : upcomingBookings.length === 0 ? (
            <View style={styles.noBookingsContainer}>
              <Text style={styles.noBookingsText}>No upcoming bookings</Text>
            </View>
          ) : (
            upcomingBookings.map((booking) => (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.bookingCard}
                onPress={() => router.push(`/booking/${booking.id}`)}
              >
                {/* Show pet image if available, otherwise use placeholder */}
                <Image 
                  source={{ 
                    uri: (() => {
                      try {
                        const petIds = JSON.parse(booking.selected_pets);
                        if (Array.isArray(petIds) && petIds.length > 0) {
                          return pets[petIds[0]]?.image_url || 'https://placehold.co/100x100/png';
                        }
                        return 'https://placehold.co/100x100/png';
                      } catch {
                        return 'https://placehold.co/100x100/png';
                      }
                    })()
                  }} 
                  style={styles.dogImage} 
                />
                <View style={styles.bookingInfo}>
                  <Text style={styles.dogName}>{formatPetsList(booking)}</Text>
                  <Text style={styles.dogBreed}>{owners[booking.owner_id]?.name || 'Loading owner...'}</Text>
                  <View style={styles.bookingDetails}>
                    <View style={styles.bookingDetailItem}>
                      <Calendar size={14} color="#666" />
                      <Text style={styles.bookingDetailText}>
                        {formatBookingDate(booking.booking_date)}
                      </Text>
                    </View>
                    <View style={styles.bookingDetailItem}>
                      <Clock size={14} color="#666" />
                      <Text style={styles.bookingDetailText}>{formatTimeRange(booking)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { CircleCheck as CheckCircle, MessageSquare } from 'lucide-react-native';

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLoading: {
    marginVertical: 8,
  },
  noBookingsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginHorizontal: 20,
  },
  noBookingsText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
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
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  earningsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 15,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    alignItems: 'center',
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Inter-Regular',
  },
  earningsValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#62C6B9',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  upcomingSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: '#62C6B9',
    fontFamily: 'Inter-Medium',
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  bookingInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  dogBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  bookingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  bookingDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    fontFamily: 'Inter-Regular',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    width: '30%',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
});