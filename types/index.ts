// Centralized type definitions

// From app/(tabs)/bookings.tsx
export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  image_url?: string;
}

export interface UserProfile {
  id: string; // Matches profiles table primary key
  name?: string; // Changed from first_name/last_name based on log
  avatar_url?: string | null;
}

export interface UserAddress {
  id: string; // Primary key
  profile_id: string; // Foreign key to profiles table
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  formatted_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_primary?: boolean;
  // created_at and updated_at can be added if needed
}

export interface Booking {
  id: string;
  owner_id: string;
  sitter_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  selected_pets: string | string[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_price: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (populated after fetching)
  owner?: UserProfile;
  address?: UserAddress;
  pets?: Pet[];
}
