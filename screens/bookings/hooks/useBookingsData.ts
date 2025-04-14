import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/useAuthStore';
import { Booking, UserProfile, UserAddress, Pet } from '../../../types'; 
import { parseISO, format } from 'date-fns';

// Helper Function: Format Date
const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'PPP'); // e.g., "Jul 21, 2024"
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

// Helper Function: Format Pets List
const formatPetsList = (booking: Booking, petsMap: { [key: string]: Pet }): string => {
  if (!booking.selected_pets || booking.selected_pets.length === 0) {
    return 'No pets specified';
  }
  const petIds = Array.isArray(booking.selected_pets) ? booking.selected_pets : booking.selected_pets.split(',');
  return petIds
    .map(id => petsMap[id]?.name || `Pet ID: ${id}`)
    .join(', ');
};

type UseBookingsDataProps = string[];

export const useBookingsData = (statusFilter: UseBookingsDataProps) => {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<{ [key: string]: UserProfile }>({});
  const [addresses, setAddresses] = useState<Record<string, UserAddress>>({});
  const [pets, setPets] = useState<{ [key: string]: Pet }>({});
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    // console.log('Fetching bookings with user ID:', user?.id);
    setLoading(true);
    setError(null);
    if (!user?.id) {
      setLoading(false);
      setError("User not authenticated");
      return;
    }

    try {
      // Step 1: Fetch bookings for the current sitter based on status
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('walking_bookings')
        .select('*')
        .eq('sitter_id', user.id)
        .in('status', statusFilter)
        .order('booking_date', { ascending: true }); // Order by date

      if (bookingsError) throw bookingsError;
      if (!bookingsData) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const ownerIds = [...new Set(bookingsData.map(booking => booking.owner_id))];
      const allPetIds = new Set<string>();
      bookingsData.forEach(booking => {
        const petIds = Array.isArray(booking.selected_pets) ? booking.selected_pets : booking.selected_pets.split(',');
        petIds.forEach((id: string) => allPetIds.add(id));
      });

      const ownersMap: { [key: string]: UserProfile } = {};
      const addressesMap: Record<string, UserAddress> = {};
      const petsMap: { [key: string]: Pet } = {};

      // Step 2 & 3: Fetch Owner Profiles and Addresses concurrently
      if (ownerIds.length > 0) {
        const [profilesResponse, addressesResponse] = await Promise.all([
          supabase.from('profiles').select('*').in('id', ownerIds),
          supabase.from('useraddress').select('*').in('profile_id', ownerIds).eq('is_primary', true)
        ]);

        if (profilesResponse.error) throw profilesResponse.error;
        profilesResponse.data?.forEach((profile: UserProfile) => {
          ownersMap[profile.id] = profile;
        });

        if (addressesResponse.error) throw addressesResponse.error;
        addressesResponse.data?.forEach((addr: UserAddress) => {
          addressesMap[addr.profile_id] = addr;
        });
      }

      // Step 4: Fetch Pet details concurrently
      if (allPetIds.size > 0) {
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .in('id', Array.from(allPetIds));
        if (petsError) throw petsError;
        petsData?.forEach((pet: Pet) => {
          petsMap[pet.id] = pet;
        });
      }
      
      // Update state once all data is fetched
      setOwners(ownersMap);
      setAddresses(addressesMap);
      setPets(petsMap);
      // Attach owner, address, and formatted pets to bookings
      const enrichedBookings = bookingsData.map(booking => ({
        ...booking,
        owner: ownersMap[booking.owner_id],
        address: addressesMap[booking.owner_id], // Assuming owner_id links to profile_id for address
        pets: (Array.isArray(booking.selected_pets) ? booking.selected_pets : booking.selected_pets.split(',')).map((id: string) => petsMap[id]).filter(Boolean) as Pet[],
      }));

      setBookings(enrichedBookings);

    } catch (err: any) {
      console.error('Error fetching bookings data:', err);
      setError(err.message || 'An unexpected error occurred');
      setBookings([]); // Clear bookings on error
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Depend only on user.id for stability

  // Function to update booking status
  const updateBookingStatus = useCallback(async (bookingId: string, newStatus: 'completed' | 'cancelled') => {
    try {
      console.log(`Attempting to update booking ID: ${bookingId} to status: ${newStatus}`); // Log ID and status
      const { data, error } = await supabase
        .from('walking_bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select(); // Select the updated row(s)

      if (error) throw error;
      console.log('Booking status updated:', data);
      return data; // Return updated booking data if needed
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      setError(err.message || 'Failed to update booking status');
      return null; // Indicate failure
    }
  }, []); // No dependencies needed for supabase client interaction

  // Effect to fetch bookings when the hook mounts or dependencies change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    owners,
    addresses,
    pets,
    formatDate,
    formatPetsList,
    refetchBookings: fetchBookings, 
    updateBookingStatus, // Expose update function
  };
};
