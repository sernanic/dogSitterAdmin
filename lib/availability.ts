import { supabase } from './supabase';

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

export interface DayAvailability {
  [day: string]: TimeSlot[];
}

export interface AvailabilityResponse {
  id: string;
  user_id: string;
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch a user's availability settings
 * @param userId The ID of the user whose availability to fetch
 * @returns The user's availability settings or null if not found
 */
export async function fetchUserAvailability(userId: string): Promise<AvailabilityResponse | null> {
  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching availability:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserAvailability:', error);
    throw error;
  }
}

/**
 * Save or update a user's availability settings
 * @param userId The ID of the user whose availability to update
 * @param availability The availability settings to save
 * @returns The updated availability settings
 */
export async function saveUserAvailability(
  userId: string,
  availability: DayAvailability
): Promise<AvailabilityResponse> {
  try {
    // First check if the user already has an availability record
    const { data: existingData } = await supabase
      .from('availability')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;

    if (existingData) {
      // Update existing record
      const { data, error } = await supabase
        .from('availability')
        .update({
          monday: availability.monday || [],
          tuesday: availability.tuesday || [],
          wednesday: availability.wednesday || [],
          thursday: availability.thursday || [],
          friday: availability.friday || [],
          saturday: availability.saturday || [],
          sunday: availability.sunday || [],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('availability')
        .insert({
          user_id: userId,
          monday: availability.monday || [],
          tuesday: availability.tuesday || [],
          wednesday: availability.wednesday || [],
          thursday: availability.thursday || [],
          friday: availability.friday || [],
          saturday: availability.saturday || [],
          sunday: availability.sunday || [],
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    console.error('Error in saveUserAvailability:', error);
    throw error;
  }
}

/**
 * Delete a user's availability settings
 * @param userId The ID of the user whose availability to delete
 */
export async function deleteUserAvailability(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error in deleteUserAvailability:', error);
    throw error;
  }
}

/**
 * Check if a specific time slot overlaps with existing slots
 * @param timeSlots Existing time slots for the day
 * @param newSlot The new time slot to check
 * @returns boolean indicating if there's an overlap
 */
export function checkTimeSlotOverlap(timeSlots: TimeSlot[], newSlot: TimeSlot): boolean | { isOverlapping: true, overlappingWith: TimeSlot } {
  const newSlotStart = convertTimeToMinutes(newSlot.start);
  const newSlotEnd = convertTimeToMinutes(newSlot.end);
  
  for (const slot of timeSlots) {
    const existingStart = convertTimeToMinutes(slot.start);
    const existingEnd = convertTimeToMinutes(slot.end);
    
    // Check for any overlap scenario
    const hasOverlap = (
      (newSlotStart >= existingStart && newSlotStart < existingEnd) || // New slot starts during existing slot
      (newSlotEnd > existingStart && newSlotEnd <= existingEnd) ||     // New slot ends during existing slot
      (newSlotStart <= existingStart && newSlotEnd >= existingEnd)     // New slot completely contains existing slot
    );
    
    if (hasOverlap) {
      // Return the overlapping slot information
      return {
        isOverlapping: true,
        overlappingWith: slot
      };
    }
  }
  
  // No overlap found
  return false;
}

/**
 * Convert time string (HH:MM) to minutes for easier comparison
 * @param time Time string in HH:MM format
 * @returns number of minutes since 00:00
 */
function convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format a time string to 12-hour format with AM/PM
 * @param time Time string in HH:MM format
 * @returns Formatted time string (e.g., "9:00 AM")
 */
export function formatTimeToAMPM(time: string): string {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return time; // Return the original if parsing fails
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Validate a time slot
 * @param slot The time slot to validate
 * @returns An error message if invalid, null if valid
 */
export function validateTimeSlot(slot: TimeSlot): string | null {
  if (!slot.start || !slot.end) {
    return 'Start and end times are required.';
  }
  
  try {
    const [startHours, startMinutes] = slot.start.split(':').map(Number);
    const [endHours, endMinutes] = slot.end.split(':').map(Number);
    
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
      return 'Invalid time format. Please use HH:MM format.';
    }
    
    // Validate time ranges
    if (startHours < 0 || startHours > 23 || startMinutes < 0 || startMinutes > 59) {
      return 'Start time is invalid. Hours must be 0-23 and minutes 0-59.';
    }
    
    if (endHours < 0 || endHours > 23 || endMinutes < 0 || endMinutes > 59) {
      return 'End time is invalid. Hours must be 0-23 and minutes 0-59.';
    }
    
    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;
    
    if (startTimeInMinutes >= endTimeInMinutes) {
      return 'End time must be later than start time.';
    }
    
    // Check operational hours (8:00 AM to 7:00 PM) (same as in database)
    const minOperationalHour = 8 * 60; // 8:00 AM in minutes
    const maxOperationalHour = 19 * 60; // 7:00 PM in minutes
    
    if (startTimeInMinutes < minOperationalHour) {
      return 'Start time cannot be earlier than 8:00 AM.';
    }
    
    if (endTimeInMinutes > maxOperationalHour) {
      return 'End time cannot be later than 7:00 PM.';
    }
    
    return null;
  } catch (error) {
    console.error('[Validation] Error validating time slot:', error);
    return 'Invalid time format. Please use HH:MM format.';
  }
}

/**
 * Sort time slots by start time
 * @param slots Array of time slots to sort
 * @returns Sorted array of time slots
 */
export function sortTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort((a, b) => {
    const aMinutes = convertTimeToMinutes(a.start);
    const bMinutes = convertTimeToMinutes(b.start);
    return aMinutes - bMinutes;
  });
}

// Track the last query time to rate limit API calls
let lastQueryTime = 0;
const QUERY_COOLDOWN_MS = 2000; // Increase to 2 seconds between calls for more aggressive throttling
let lastQueriedUserId: string | null = null;

export async function getDirectSitterAvailability(userId: string) {
  try {
    const now = Date.now();
    
    // Only throttle calls for the same user ID
    if (lastQueriedUserId === userId && now - lastQueryTime < QUERY_COOLDOWN_MS) {
      console.log(`[API] Rate limiting API calls for user ${userId.slice(0, 8)} - throttled`);
      // Return empty data without making API call to prevent flooding
      return { 
        data: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }, 
        error: null 
      };
    }
    
    // Update tracking state
    lastQueryTime = now;
    lastQueriedUserId = userId;
    
    // Fetch data from the database
    console.log(`[API] Fetching availability for user ${userId.slice(0, 8)}...`);
    const { data, error } = await supabase
      .from('sitter_weekly_availability')
      .select('id, sitter_id, weekday, start_time, end_time')
      .eq('sitter_id', userId);
    
    if (error) {
      console.error('[API] Database error:', error);
      throw error;
    }
    
    console.log(`[API] Availability data fetched: ${data?.length || 0} items`);
    
    // Process the data even if empty
    const dayMap: Record<number, string> = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      7: 'sunday'
    };
    
    // Default empty availability structure
    const availability: Record<string, any[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    // Process data if exists
    if (data && data.length > 0) {
      data.forEach(item => {
        if (!item || typeof item.weekday !== 'number') {
          console.warn('[API] Invalid item in results:', item);
          return;
        }
        
        const day = dayMap[item.weekday] || 'monday';
        
        availability[day].push({
          id: item.id || Math.random().toString(36).substring(2, 9),
          start: item.start_time ? item.start_time.slice(0, 5) : '09:00',
          end: item.end_time ? item.end_time.slice(0, 5) : '19:00'
        });
      });
    } else {
      console.log('[API] No availability data found for user');
    }
    
    // Return the processed data
    return { 
      data: availability, 
      error: null 
    };
  } catch (error: any) {
    console.error('[API] Direct query error:', error);
    return { 
      data: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      }, 
      error: error.message 
    };
  }
}

// Update the debug function to add more detailed logging
export async function debugAvailabilityTables(userId: string) {
  console.log('Debugging availability for user ID:', userId);
  
  try {
    // Log the SQL function details
    console.log('SQL Function Definition Expected Fields:');
    console.log('The get_sitter_availability_for_date function should return:');
    console.log('- id UUID');
    console.log('- weekday INT or weekday_number INT');
    console.log('- start_time TIME');
    console.log('- end_time TIME');
    
    // Check for RPC function
    console.log('\nTesting RPC function...');
    const rpcResult = await supabase.rpc('get_sitter_availability_for_date', {
      p_sitter_id: userId,
      p_date: new Date().toISOString().split('T')[0]
    });
    
    console.log('RPC Result:', {
      error: rpcResult.error,
      data: rpcResult.data?.length ? `${rpcResult.data.length} records` : 'No data',
      firstRecord: rpcResult.data?.[0],
      allFields: rpcResult.data?.[0] ? Object.keys(rpcResult.data[0]) : 'No fields available'
    });
    
    // Check direct table access
    console.log('\nTesting direct table access...');
    const tableResult = await supabase
      .from('sitter_weekly_availability')
      .select('*')
      .eq('sitter_id', userId)
      .limit(5);
    
    console.log('Table Result:', {
      error: tableResult.error,
      data: tableResult.data?.length ? `${tableResult.data.length} records` : 'No data',
      firstRecord: tableResult.data?.[0],
      schema: tableResult.data?.[0] ? Object.keys(tableResult.data[0]) : 'No fields available'
    });
    
    // Try direct function
    console.log('\nTrying direct function...');
    const directResult = await getDirectSitterAvailability(userId);
    console.log('Direct function result:', directResult);
    
    // List all tables for verification
    console.log('\nChecking database schema...');
    const tablesResult = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    console.log('Available tables:', {
      error: tablesResult.error,
      tables: tablesResult.data,
    });
    
    return {
      rpc: rpcResult,
      table: tableResult,
      direct: directResult,
      schema: tablesResult,
    };
  } catch (error) {
    console.error('Debug error:', error);
    return { error };
  }
}

/**
 * Removes duplicate time slots that have the exact same start and end times
 * This is useful when comparing what's already saved versus what's being edited
 */
export function removeDuplicateTimeSlots(existingSlots: TimeSlot[], newSlots: TimeSlot[]): TimeSlot[] {
  // If there are no existing slots, return all new slots
  if (!existingSlots || existingSlots.length === 0) {
    return newSlots;
  }
  
  // If there are no new slots, return empty array
  if (!newSlots || newSlots.length === 0) {
    return [];
  }
  
  // Filter out any new slots that exactly match an existing slot's time range
  return newSlots.filter(newSlot => {
    // Check if this new slot exactly matches any existing slot
    const exactMatch = existingSlots.some(existingSlot => 
      existingSlot.start === newSlot.start && 
      existingSlot.end === newSlot.end
    );
    
    // Return false to filter out exact matches (since they don't need to be inserted again)
    return !exactMatch;
  });
}

/**
 * Identifies which slots were modified by comparing original slots with updated slots
 * @returns An object containing added, modified, and removed slots
 */
export function identifyChangedTimeSlots(
  originalSlots: TimeSlot[], 
  updatedSlots: TimeSlot[]
): {
  added: TimeSlot[],
  modified: TimeSlot[],
  unchanged: TimeSlot[],
  removed: TimeSlot[]
} {
  // Initialize result containers
  const added: TimeSlot[] = [];
  const modified: TimeSlot[] = [];
  const unchanged: TimeSlot[] = [];
  const removed: TimeSlot[] = [];
  
  // Find added and modified slots
  updatedSlots.forEach(updatedSlot => {
    // Look for a slot with same ID in the original slots
    const originalSlot = originalSlots.find(origSlot => origSlot.id === updatedSlot.id);
    
    if (!originalSlot) {
      // This is a completely new slot
      added.push(updatedSlot);
    } else if (
      originalSlot.start !== updatedSlot.start || 
      originalSlot.end !== updatedSlot.end
    ) {
      // This is a modified slot (same ID but different times)
      modified.push(updatedSlot);
    } else {
      // This slot wasn't changed
      unchanged.push(updatedSlot);
    }
  });
  
  // Find removed slots (in original but not in updated)
  originalSlots.forEach(originalSlot => {
    const stillExists = updatedSlots.some(updatedSlot => updatedSlot.id === originalSlot.id);
    if (!stillExists) {
      removed.push(originalSlot);
    }
  });
  
  return { added, modified, unchanged, removed };
} 