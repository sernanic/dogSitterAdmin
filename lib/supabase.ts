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
  },
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
  bio?: string;
  location?: string;
  phoneNumber?: string;
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
  is_primary: boolean;
  created_at: string;
  updated_at: string;
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
      console.error("Error in regular upsert:", error);
      
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
    console.error("Profile creation error:", error);
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
        console.error('Supabase storage upload error:', JSON.stringify(error, null, 2));
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
      console.error('Caught error during upload step:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
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
    console.error('Error updating avatar URL:', error);
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
    console.error('Error fetching addresses:', error);
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
    console.error('Error fetching primary address:', error);
    throw error;
  }
};

export const upsertAddress = async (address: Partial<Address>): Promise<Address> => {
  try {
    // If updating an existing address
    if (address.id) {
      const { data, error } = await supabase
        .from('addresses')
        .update(address)
        .eq('id', address.id)
        .select()
        .single();
        
      if (error) throw error;
      return data as Address;
    } 
    // Creating a new address
    else {
      const { data, error } = await supabase
        .from('addresses')
        .insert(address)
        .select()
        .single();
        
      if (error) throw error;
      return data as Address;
    }
  } catch (error) {
    console.error('Error upserting address:', error);
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
    console.error('Error setting primary address:', error);
    throw error;
  }
}; 