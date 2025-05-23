import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as decode from 'base64-arraybuffer';

// Get the Supabase URL and anon key from app.config.js
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'your-supabase-url';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'your-supabase-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Set up auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event);
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Interface for sitter stats
export interface SitterStats {
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_clients: number;
  last_updated_at: string;
}

// Helper function to get sitter stats
export const getSitterStats = async (sitterId: string): Promise<SitterStats> => {
  const { data, error } = await supabase
    .from('sitter_stats')
    .select('*')
    .eq('sitter_id', sitterId)
    .single();
    
  if (error) {
    // PGRST116 is the "no rows" error code - this is normal for new sitters
    if (isNoRowsError(error)) {
      // For new sitters, return default values without logging an error
      return {
        total_bookings: 0,
        completed_bookings: 0,
        average_rating: 0,
        total_clients: 0,
        last_updated_at: new Date().toISOString()
      };
    }
    // Only log unexpected errors
    console.log('Error fetching sitter stats:', error);
    // Return default values for any error
    return {
      total_bookings: 0,
      completed_bookings: 0,
      average_rating: 0,
      total_clients: 0,
      last_updated_at: new Date().toISOString()
    };
  }
  
  return data;
};

// Helper function to get current session
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Types for profiles table
export interface Profile {
  id: string;
  created_at: string;
  email: string;
  name: string;
  role: 'sitter';
  avatar_url?: string;
  background_url?: string;
  bio?: string;
  location?: string;
  phoneNumber?: string;
  service_type?: number;
}

// Types for addresses table
export interface Address {
  id: string;
  profile_id: string;
  formatted_address: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  // PostgreSQL point type - when retrieved it's an array, but when sending we use a string
  location?: string | [number, number];
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// Types for sitter unavailability table
export interface SitterUnavailability {
  id: string;
  sitter_id: string;
  unavailable_date: string; // ISO format YYYY-MM-DD
  created_at: string;
}

// Helper function to upsert profile data
export const upsertProfile = async (profile: Partial<Profile>) => {
  try {
    // First try to insert using regular client
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select();
    
    if (error) {
      console.log("Error in regular upsert:", error);
      
      // Try with service role client if available (requires separate implementation)
      // For registration, we'll rely on the trigger we created in the database
      // that will automatically create a profile when a user is created
      
      // Return a basic profile structure with the data we have
      // The actual profile in the database will be created by the trigger
      return { 
        id: profile.id,
        created_at: new Date().toISOString(),
        email: profile.email || '',
        name: profile.name || '',
        role: profile.role || 'sitter',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        location: profile.location || '',
      } as Profile;
    }
    
    return data?.[0];
  } catch (error) {
    console.log("Profile creation error:", error);
    throw error;
  }
};

// Helper function to get profile by user ID
export const getProfileById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Profile;
};

// Helper function to upload avatar to storage
export const uploadAvatar = async (userId: string, uri: string): Promise<string> => {
  try {
    console.log('Starting avatar upload process for URI:', uri);

    // Step 1: Compress the image (optional but recommended)
    console.log('Compressing image...');
    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    console.log(`Compressed image URI: ${compressedImage.uri}`);
    
    // Step 2: Create a unique file path
    const fileName = `${userId}-${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;
    
    // Step 3: Read the file as base64 data
    const fileBase64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`File read as base64, length: ${fileBase64.length}`);
    
    // Step 4: Convert the base64 string to an ArrayBuffer
    const fileArrayBuffer = decode.decode(fileBase64);
    console.log(`File converted to ArrayBuffer, byte length: ${fileArrayBuffer.byteLength}`);
    
    // Step 5: Upload to Supabase Storage
    console.log('Uploading to Supabase storage...');
    console.log(`File path: ${filePath}`);
    console.log(`ArrayBuffer length: ${fileArrayBuffer.byteLength}`);
    
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileArrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) {
        console.log('Supabase storage upload error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || !data.path) {
        throw new Error('Upload succeeded but path is missing');
      }
      
      console.log('Upload succeeded. Data:', JSON.stringify(data, null, 2));
      
      // Step 6: Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log('Got public URL:', urlData.publicUrl);
      console.log('Avatar upload completed successfully');
      return urlData.publicUrl;
    } catch (uploadError) {
      console.log('Caught error during upload step:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.log('Error uploading avatar:', error);
    throw error;
  }
};

// Helper function to update avatar URL in profile
export const updateAvatarUrl = async (userId: string, avatarUrl: string): Promise<Profile> => {
  try {
    // Update the profile with the new avatar URL
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.log('Error updating avatar URL:', error);
    throw error;
  }
};

// Helper function to upload background image to storage
export const uploadProfileBackground = async (userId: string, uri: string): Promise<string> => {
  try {
    console.log('Starting background image upload process for URI:', uri);

    // Step 1: Compress the image (optional but recommended)
    console.log('Compressing image...');
    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    console.log(`Compressed image URI: ${compressedImage.uri}`);
    
    // Step 2: Create a unique file path
    const fileName = `bg-${userId}-${Date.now()}.jpg`;
    const filePath = `backgrounds/${fileName}`;
    
    // Step 3: Read the file as base64 data
    const fileBase64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`File read as base64, length: ${fileBase64.length}`);
    
    // Step 4: Convert the base64 string to an ArrayBuffer
    const fileArrayBuffer = decode.decode(fileBase64);
    console.log(`File converted to ArrayBuffer, byte length: ${fileArrayBuffer.byteLength}`);
    
    // Step 5: Upload to Supabase Storage
    console.log('Uploading to Supabase storage...');
    console.log(`File path: ${filePath}`);
    console.log(`ArrayBuffer length: ${fileArrayBuffer.byteLength}`);
    
    try {
      const { data, error } = await supabase.storage
        .from('avatars') // Reusing the same bucket for now - could create a dedicated one
        .upload(filePath, fileArrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) {
        console.log('Supabase storage upload error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || !data.path) {
        throw new Error('Upload succeeded but path is missing');
      }
      
      console.log('Upload succeeded. Data:', JSON.stringify(data, null, 2));
      
      // Step 6: Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log('Got public URL:', urlData.publicUrl);
      console.log('Background image upload completed successfully');
      return urlData.publicUrl;
    } catch (uploadError) {
      console.log('Caught error during upload step:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.log('Error uploading background image:', error);
    throw error;
  }
};

// Helper function to update background URL in profile
export const updateBackgroundUrl = async (userId: string, backgroundUrl: string): Promise<Profile> => {
  try {
    // Update the profile with the new background URL
    const { data, error } = await supabase
      .from('profiles')
      .update({ background_url: backgroundUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.log('Error updating background URL:', error);
    throw error;
  }
};

// Add helper functions for address management
export const getAddressesByProfileId = async (profileId: string): Promise<Address[]> => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_primary', { ascending: false });
      
    if (error) throw error;
    return data as Address[];
  } catch (error) {
    console.log('Error fetching addresses:', error);
    throw error;
  }
};

export const getPrimaryAddress = async (profileId: string): Promise<Address | null> => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_primary', true)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned error
        return null;
      }
      throw error;
    }
    return data as Address;
  } catch (error) {
    console.log('Error fetching primary address:', error);
    throw error;
  }
};

// Helper function to delete a user account and all related data
export const deleteAccount = async (userId: string): Promise<void> => {
  try {
    console.log('Starting account deletion process for user:', userId);
    
    // 1. Delete related data first
    // Delete portfolio images if they exist
    try {
      const { error: portfolioError } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('sitter_id', userId);
      
      if (!portfolioError) {
        console.log('Successfully deleted portfolio images');
      }
    } catch (err) {
      console.log('No portfolio images found or error deleting them');
    }
    
    // Delete addresses
    const { error: addressError } = await supabase
      .from('addresses')
      .delete()
      .eq('profile_id', userId);
      
    if (addressError) {
      console.error('Error deleting addresses:', addressError);
    } else {
      console.log('Successfully deleted addresses');
    }
    
    // Delete profile data
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (!profileError) {
        console.log('Successfully deleted profile record');
      } else {
        console.error('Error deleting profile record:', profileError);
      }
    } catch (err) {
      console.error('Error during profile deletion:', err);
    }
    
    // 2. Delete or deactivate user-generated content
    // Note: Add here any other tables that need cleaning up
    
    // 3. Since we can't delete the auth record from client side,
    // sign out the user which effectively revokes their session
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('Error signing out:', signOutError);
    } else {
      console.log('User signed out successfully');
    }
    
    console.log('Account data deletion completed');
    
    // 4. Display information to the user
    // Let them know that while their data has been deleted,
    // they may need to contact support to completely delete their account
    // This message should be handled by the UI, not here in the function
    
  } catch (error) {
    console.error('Error during account deletion:', error);
    throw error;
  }
};

export const upsertAddress = async (address: Partial<Address>): Promise<Address> => {
  try {
    // Prepare the address data for saving
    const addressToSave: any = { ...address };
    
    // Handle the point location
    delete addressToSave.location;
    
    // Add the location point if we have latitude and longitude
    if (addressToSave.latitude !== undefined && addressToSave.longitude !== undefined) {
      // For PostgreSQL point type, we use a string in the format '(x,y)'
      addressToSave.location = `(${addressToSave.longitude},${addressToSave.latitude})`;
    }
    
    // If updating an existing address
    if (address.id) {
      const { data, error } = await supabase
        .from('addresses')
        .update(addressToSave)
        .eq('id', address.id)
        .select()
        .single();
        
      if (error) {
        console.log('Error updating address:', error);
        throw error;
      }
      
      return data as Address;
    } 
    // Creating a new address
    else {
      const { data, error } = await supabase
        .from('addresses')
        .insert(addressToSave)
        .select()
        .single();
        
      if (error) {
        console.log('Error inserting address:', error);
        throw error;
      }
      
      return data as Address;
    }
  } catch (error) {
    console.log('Error upserting address:', error);
    throw error;
  }
};

// Helper function to set an address as primary and make others non-primary
export const setPrimaryAddress = async (addressId: string, profileId: string): Promise<void> => {
  try {
    // First set all addresses as non-primary
    await supabase
      .from('addresses')
      .update({ is_primary: false })
      .eq('profile_id', profileId);
      
    // Then set the selected address as primary
    const { error } = await supabase
      .from('addresses')
      .update({ is_primary: true })
      .eq('id', addressId);
      
    if (error) throw error;
  } catch (error) {
    console.log('Error setting primary address:', error);
    throw error;
  }
};

// Helper function to get all unavailable dates for a sitter
export const getSitterUnavailableDates = async (sitterId: string): Promise<SitterUnavailability[]> => {
  try {
    console.log('[getSitterUnavailableDates] Starting fetch for sitter:', sitterId);
    
    // Verify the sitter_unavailability table exists
    console.log('[getSitterUnavailableDates] Checking if table exists...');
    
    try {
      // First just get count to check table access
      const { count, error: countError } = await supabase
        .from('sitter_unavailability')
        .select('*', { count: 'exact', head: true })
        .eq('sitter_id', sitterId);
        
      if (countError) {
        console.log('[getSitterUnavailableDates] Error checking table:', countError);
        
        // Table might not exist, return empty array
        if (countError.code === '42P01') { // undefined_table
          console.log('[getSitterUnavailableDates] Table does not exist');
          return [];
        }
        
        // Other permission error
        throw countError;
      }
      
      console.log(`[getSitterUnavailableDates] Found ${count} records for sitter`);
    } catch (checkError) {
      console.log('[getSitterUnavailableDates] Error checking table existence:', checkError);
      // Continue with main query anyway
    }
    
    // Now make the actual query
    const { data, error } = await supabase
      .from('sitter_unavailability')
      .select('*')
      .eq('sitter_id', sitterId);
      
    if (error) {
      console.log('[getSitterUnavailableDates] Query error:', error);
      throw error;
    }
    
    console.log(`[getSitterUnavailableDates] Successfully fetched ${data?.length || 0} unavailable dates`);
    return data as SitterUnavailability[];
  } catch (error) {
    console.log('[getSitterUnavailableDates] Fatal error:', error);
    // Return empty array instead of throwing, to prevent UI from hanging
    return [];
  }
};

// Helper function to add an unavailable date for a sitter
export const addSitterUnavailableDate = async (sitterId: string, unavailableDate: string): Promise<SitterUnavailability> => {
  try {
    console.log(`Adding unavailable date for sitter ${sitterId}: ${unavailableDate}`);
    
    const { data, error } = await supabase
      .from('sitter_unavailability')
      .insert({
        sitter_id: sitterId,
        unavailable_date: unavailableDate
      })
      .select()
      .single();
      
    if (error) {
      console.log('Error adding unavailable date:', error);
      throw error;
    }
    
    console.log('Successfully added unavailable date:', data);
    return data as SitterUnavailability;
  } catch (error) {
    console.log('Error in addSitterUnavailableDate:', error);
    throw error;
  }
};

// Helper function to delete an unavailable date for a sitter
export const deleteSitterUnavailableDate = async (sitterId: string, unavailableDate: string): Promise<void> => {
  try {
    console.log(`Deleting unavailable date for sitter ${sitterId}: ${unavailableDate}`);
    
    const { error } = await supabase
      .from('sitter_unavailability')
      .delete()
      .eq('sitter_id', sitterId)
      .eq('unavailable_date', unavailableDate);
      
    if (error) {
      console.log('Error deleting unavailable date:', error);
      throw error;
    }
    
    console.log('Successfully deleted unavailable date');
  } catch (error) {
    console.log('Error in deleteSitterUnavailableDate:', error);
    throw error;
  }
};

// Helper function to check if a sitter is available on a specific date
export const checkSitterAvailabilityForDate = async (sitterId: string, date: string): Promise<boolean> => {
  try {
    console.log(`Checking availability for sitter ${sitterId} on date ${date}`);
    
    // First check if the date is marked as unavailable
    const { data, error } = await supabase
      .from('sitter_unavailability')
      .select('*')
      .eq('sitter_id', sitterId)
      .eq('unavailable_date', date);
      
    if (error) {
      console.log('Error checking unavailability:', error);
      throw error;
    }
    
    // If we have an unavailability record, the sitter is not available
    if (data && data.length > 0) {
      console.log('Sitter is marked as unavailable on this date');
      return false;
    }
    
    // Otherwise, check if they have weekly availability for this day of the week
    // This would involve checking the sitter_weekly_availability table
    // ...
    
    // For now, assume they're available if not marked as unavailable
    console.log('Sitter appears to be available on this date');
    return true;
  } catch (error) {
    console.log('Error in checkSitterAvailabilityForDate:', error);
    throw error;
  }
};

// Helper function to clear all unavailable dates for a sitter
export const clearSitterUnavailableDates = async (sitterId: string): Promise<void> => {
  try {
    console.log(`Clearing all unavailable dates for sitter ${sitterId}`);
    
    const { error } = await supabase
      .from('sitter_unavailability')
      .delete()
      .eq('sitter_id', sitterId);
      
    if (error) {
      console.log('Error clearing unavailable dates:', error);
      throw error;
    }
    
    console.log('Successfully cleared all unavailable dates');
  } catch (error) {
    console.log('Error in clearSitterUnavailableDates:', error);
    throw error;
  }
}; 

// Interface for sitter earnings data
export interface SitterEarnings {
  today: string;
  thisWeek: string;
  thisMonth: string;
  totalEarnings: string;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
}

// Helper function to get sitter earnings data
export const getSitterEarnings = async (sitterId: string): Promise<SitterEarnings> => {
  try {
    // First try to get from the summary view which is faster
    const { data, error } = await supabase
      .from('sitter_earnings_summary')
      .select('*')
      .eq('sitter_id', sitterId)
      .single();
    
    if (error) {
      // PGRST116 is the "no rows" error code - this is normal for new sitters
      if (isNoRowsError(error)) {
        // For new sitters, return default values without logging an error
        return {
          today: '$0.00',
          thisWeek: '$0.00',
          thisMonth: '$0.00',
          totalEarnings: '$0.00',
          paidInvoicesCount: 0,
          pendingInvoicesCount: 0
        };
      }
      
      console.log('Error fetching sitter earnings from summary view:', error);
      
      // Fallback: Call the function directly
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_sitter_earnings', { p_sitter_id: sitterId });
      
      if (functionError) {
        console.log('Error fetching sitter earnings via function:', functionError);
        // Return default values if all methods fail
        return {
          today: '$0.00',
          thisWeek: '$0.00',
          thisMonth: '$0.00',
          totalEarnings: '$0.00',
          paidInvoicesCount: 0,
          pendingInvoicesCount: 0
        };
      }
      
      // Process function data
      const today = functionData.find((item: any) => item.period === 'today');
      const thisWeek = functionData.find((item: any) => item.period === 'this_week');
      const thisMonth = functionData.find((item: any) => item.period === 'this_month');
      
      return {
        today: formatCurrency(today?.earnings || 0),
        thisWeek: formatCurrency(thisWeek?.earnings || 0),
        thisMonth: formatCurrency(thisMonth?.earnings || 0),
        totalEarnings: '$0.00', // Not available from function call
        paidInvoicesCount: (today?.bookings_count || 0) + (thisWeek?.bookings_count || 0) + (thisMonth?.bookings_count || 0),
        pendingInvoicesCount: 0 // Not available from function call
      };
    }
    
    // Process data from summary view
    return {
      today: formatCurrency(data.today_earnings || 0),
      thisWeek: formatCurrency(data.weekly_earnings || 0),
      thisMonth: formatCurrency(data.monthly_earnings || 0),
      totalEarnings: formatCurrency(data.total_earnings || 0),
      paidInvoicesCount: data.paid_invoices_count || 0,
      pendingInvoicesCount: data.pending_invoices_count || 0
    };
  } catch (error) {
    console.log('Error in getSitterEarnings:', error);
    return {
      today: '$0.00',
      thisWeek: '$0.00',
      thisMonth: '$0.00',
      totalEarnings: '$0.00',
      paidInvoicesCount: 0,
      pendingInvoicesCount: 0
    };
  }
};

// Helper function to format currency values
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// SitterInfo interface for storing sitter rates
export interface SitterInfo {
  id: string;
  sitter_id: string;
  walking_rate_per_hour: number;
  walking_rate_for_additional_dog: number;
  boarding_rate_per_day: number;
  boarding_rate_for_additional_dog: number;
  max_dogs_walking: number;
  max_dogs_boarding: number;
  created_at: string;
  updated_at: string;
}

// Helper function to get sitter info by sitter ID
export const getSitterInfo = async (sitterId: string): Promise<SitterInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('sitter_info')
      .select('*')
      .eq('sitter_id', sitterId)
      .single();
    
    if (error) {
      // PGRST116 is the "no rows" error code - this is normal for new sitters
      if (isNoRowsError(error)) {
        // For new sitters, it's normal to not have info yet
        return null;
      }
      console.log('Error fetching sitter info:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log('Error in getSitterInfo:', error);
    return null;
  }
};

// Helper function to update walking rates
export const updateWalkingRates = async (
  sitterId: string,
  ratePerHour: number,
  rateForAdditionalDog: number,
  maxDogs: number
): Promise<SitterInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('sitter_info')
      .upsert({
        sitter_id: sitterId,
        walking_rate_per_hour: ratePerHour,
        walking_rate_for_additional_dog: rateForAdditionalDog,
        max_dogs_walking: maxDogs
      }, { onConflict: 'sitter_id' })
      .select()
      .single();
    
    if (error) {
      console.log('Error updating walking rates:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log('Error in updateWalkingRates:', error);
    return null;
  }
};

// Helper function to update boarding rates
export const updateBoardingRates = async (
  sitterId: string,
  ratePerDay: number,
  rateForAdditionalDog: number,
  maxDogs: number
): Promise<SitterInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('sitter_info')
      .upsert({
        sitter_id: sitterId,
        boarding_rate_per_day: ratePerDay,
        boarding_rate_for_additional_dog: rateForAdditionalDog,
        max_dogs_boarding: maxDogs
      }, { onConflict: 'sitter_id' })
      .select()
      .single();
    
    if (error) {
      console.log('Error updating boarding rates:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log('Error in updateBoardingRates:', error);
    return null;
  }
};

// Portfolio image interface
export interface PortfolioImage {
  id: string;
  sitter_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Helper functions for portfolio image management
export const getPortfolioImages = async (sitterId: string): Promise<PortfolioImage[]> => {
  try {
    const { data, error } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('sitter_id', sitterId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as PortfolioImage[];
  } catch (error) {
    console.log('Error fetching portfolio images:', error);
    throw error;
  }
};

// Helper function to upload portfolio image to storage
export const uploadPortfolioImage = async (sitterId: string, uri: string, description?: string): Promise<PortfolioImage> => {
  try {
    console.log('Starting portfolio image upload process for URI:', uri);

    // Step 1: Compress the image (optional but recommended)
    console.log('Compressing image...');
    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    console.log(`Compressed image URI: ${compressedImage.uri}`);
    
    // Step 2: Create a unique file path
    const fileName = `${sitterId}-${Date.now()}.jpg`;
    const filePath = `${fileName}`;
    
    // Step 3: Read the file as base64 data
    const fileBase64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Step 4: Convert the base64 string to an ArrayBuffer
    const fileArrayBuffer = decode.decode(fileBase64);
    
    // Step 5: Upload to Supabase Storage
    console.log('Uploading to Supabase storage...');
    
    try {
      const { data, error } = await supabase.storage
        .from('portfolio')
        .upload(filePath, fileArrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) {
        console.log('Supabase storage upload error:', error);
        throw error;
      }
      
      if (!data || !data.path) {
        throw new Error('Upload succeeded but path is missing');
      }
      
      // Step 6: Get the public URL
      const { data: urlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(data.path);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      // Step 7: Save image metadata to portfolio_images table
      const { data: imageData, error: imageError } = await supabase
        .from('portfolio_images')
        .insert({
          sitter_id: sitterId,
          image_url: urlData.publicUrl,
          description: description || ''
        })
        .select()
        .single();
        
      if (imageError) {
        console.log('Error saving portfolio image metadata:', imageError);
        throw imageError;
      }
      
      return imageData as PortfolioImage;
    } catch (uploadError) {
      console.log('Caught error during upload step:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.log('Error uploading portfolio image:', error);
    throw error;
  }
};

// Helper function to delete a portfolio image
export const deletePortfolioImage = async (imageId: string, imageUrl: string): Promise<void> => {
  try {
    // First get the image data to verify ownership
    const { data: imageData, error: fetchError } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('id', imageId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('portfolio')
      .remove([fileName]);
      
    if (storageError) {
      console.log('Error removing file from storage:', storageError);
      // Continue to delete the database record even if storage deletion fails
    }
    
    // Delete the database record
    const { error: dbError } = await supabase
      .from('portfolio_images')
      .delete()
      .eq('id', imageId);
      
    if (dbError) throw dbError;
    
  } catch (error) {
    console.log('Error deleting portfolio image:', error);
    throw error;
  }
};

// Helper utility to check if an error is a "no rows" error
export const isNoRowsError = (error: any): boolean => {
  return error && error.code === 'PGRST116';
};

// Grooming info interface
export interface GroomingInfo {
  id: string;
  sitter_id: string;
  small_dog_rate: number;
  medium_dog_rate: number;
  large_dog_rate: number;
  created_at: string;
  updated_at: string;
}

// Helper function to get grooming info for a sitter
export const getGroomingInfo = async (sitterId: string): Promise<GroomingInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('grooming_info')
      .select('*')
      .eq('sitter_id', sitterId)
      .single();
    
    if (error) {
      if (isNoRowsError(error)) {
        return null;
      }
      console.log('Error fetching grooming info:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log('Error in getGroomingInfo:', error);
    return null;
  }
};

// Helper function to update grooming rates
export const updateGroomingRates = async (
  sitterId: string,
  smallDogRate: number,
  mediumDogRate: number,
  largeDogRate: number
): Promise<GroomingInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('grooming_info')
      .upsert({
        sitter_id: sitterId,
        small_dog_rate: smallDogRate,
        medium_dog_rate: mediumDogRate,
        large_dog_rate: largeDogRate
      }, { onConflict: 'sitter_id' })
      .select()
      .single();
    
    if (error) {
      console.log('Error updating grooming rates:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log('Error in updateGroomingRates:', error);
    return null;
  }
};

// Helper function to update service type in profile
export const updateServiceType = async (userId: string, serviceType: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ service_type: serviceType })
      .eq('id', userId);
    
    if (error) {
      console.log('Error updating service type:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('Error in updateServiceType:', error);
    return false;
  }
};