import { TimeSlot, checkTimeSlotOverlap, validateTimeSlot, formatTimeToAMPM as formatToAMPM } from './availability';
import { supabase, getSitterUnavailableDates, clearSitterUnavailableDates, addSitterUnavailableDate } from './supabase';

// Re-export formatTimeToAMPM from availability
export const formatTimeToAMPM = formatToAMPM;

export interface UnavailableTimeSlot extends TimeSlot {
  date: string; // YYYY-MM-DD format
}

export interface DateUnavailability {
  [date: string]: UnavailableTimeSlot[];
}

export interface UnavailabilityResponse {
  id: string;
  user_id: string;
  unavailable_dates: {
    [date: string]: UnavailableTimeSlot[];
  };
  created_at: string;
  updated_at: string;
}

/**
 * Converts a date to YYYY-MM-DD format
 */
export function formatDateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return formatDateToString(new Date());
}

/**
 * Returns true if the date is in the past
 */
export function isDateInPast(dateString: string): boolean {
  const today = getCurrentDate();
  return dateString < today;
}

/**
 * Validates if the unavailability slot is correct
 */
export function validateUnavailabilitySlot(slot: UnavailableTimeSlot): string | null {
  // First check if the time slot itself is valid
  const timeValidation = validateTimeSlot(slot);
  if (timeValidation) return timeValidation;

  // Then check if the date is valid
  if (!slot.date) {
    return 'Date is required';
  }

  if (isDateInPast(slot.date)) {
    return 'Cannot set unavailability for past dates';
  }

  return null;
}

/**
 * Checks for overlaps in unavailability slots for a specific date
 */
export function checkUnavailabilityOverlap(
  dateSlots: UnavailableTimeSlot[],
  newSlot: UnavailableTimeSlot
): boolean | { isOverlapping: true; overlappingWith: UnavailableTimeSlot } {
  const result = checkTimeSlotOverlap(dateSlots, newSlot);
  
  if (result !== false && typeof result === 'object') {
    // Ensure the overlappingWith property has the correct type
    return {
      isOverlapping: true,
      overlappingWith: result.overlappingWith as UnavailableTimeSlot
    };
  }
  
  return result;
}

/**
 * Sorts unavailability slots by date and then by start time
 */
export function sortUnavailabilitySlots(slots: UnavailableTimeSlot[]): UnavailableTimeSlot[] {
  return slots.sort((a, b) => {
    // First sort by date
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    
    // Then by start time
    return a.start.localeCompare(b.start);
  });
}

/**
 * Fetches a sitter's unavailability dates from the database
 */
export async function fetchUserUnavailability(userId: string): Promise<UnavailabilityResponse | null> {
  try {
    console.log('[fetchUserUnavailability] Starting fetch for user:', userId);
    
    // Add a timeout to prevent hanging
    const fetchPromise = getSitterUnavailableDates(userId);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Fetch unavailability timeout after 8 seconds'));
      }, 8000);
    });
    
    // Race the fetch against the timeout
    const unavailableDates = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]).catch(error => {
      console.error('[fetchUserUnavailability] Error or timeout:', error);
      
      // Return empty array to allow the UI to proceed
      console.log('[fetchUserUnavailability] Returning empty data due to error');
      return [];
    });
    
    console.log(`[fetchUserUnavailability] Received ${unavailableDates.length} unavailable dates`);
    
    // Convert the database response to our DateUnavailability format
    const unavailabilityMap: { [date: string]: UnavailableTimeSlot[] } = {};
    
    if (unavailableDates && unavailableDates.length > 0) {
      unavailableDates.forEach(item => {
        const date = item.unavailable_date;
        console.log(`[fetchUserUnavailability] Processing date: ${date}`);
        
        // For each date, add an all-day time slot (8am-7pm)
        if (!unavailabilityMap[date]) {
          unavailabilityMap[date] = [];
        }
        
        unavailabilityMap[date].push({
          id: item.id || generateUnavailabilitySlotId(),
          date: date,
          start: '08:00',
          end: '19:00'
        });
      });
    }
    
    console.log(`[fetchUserUnavailability] Processed ${Object.keys(unavailabilityMap).length} unavailable dates`);
    
    return {
      id: 'unavailability-' + userId,
      user_id: userId,
      unavailable_dates: unavailabilityMap,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[fetchUserUnavailability] Fatal error:', error);
    
    // Instead of returning null, return an empty response to prevent UI from hanging
    return {
      id: 'unavailability-' + userId,
      user_id: userId,
      unavailable_dates: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Saves a sitter's unavailability dates to the database
 */
export async function saveUserUnavailability(
  userId: string,
  unavailability: DateUnavailability
): Promise<UnavailabilityResponse | null> {
  try {
    console.log(`Saving unavailability for user ${userId}:`, 
      Object.keys(unavailability).length, 'dates');
    
    // First, clear all existing unavailability records for this sitter
    await clearSitterUnavailableDates(userId);
    
    // Now insert all the unavailable dates
    const unavailableDates = Object.keys(unavailability);
    
    if (unavailableDates.length > 0) {
      console.log('Adding new unavailable dates:', unavailableDates);
      
      // Add each date one by one
      for (const date of unavailableDates) {
        await addSitterUnavailableDate(userId, date);
      }
    }
    
    console.log('Unavailability saved successfully');
    
    return {
      id: 'unavailability-' + userId,
      user_id: userId,
      unavailable_dates: unavailability,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in saveUserUnavailability:', error);
    return null;
  }
}

// Helper functions for UnavailabilityManager component

/**
 * Formats unavailability data for display in a calendar
 */
export function formatUnavailabilityForCalendar(
  unavailability: DateUnavailability
): { [date: string]: any } {
  const markedDates: { [date: string]: any } = {};
  
  Object.entries(unavailability).forEach(([date, slots]) => {
    if (slots.length > 0) {
      markedDates[date] = {
        selected: true,
        marked: true,
        selectedColor: '#f44336', // Red for unavailable days
        dotColor: '#f44336'
      };
    }
  });
  
  return markedDates;
}

/**
 * Generates a unique ID for a new unavailability slot
 */
export function generateUnavailabilitySlotId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Creates a new unavailability slot with default values
 */
export function createUnavailabilitySlot(
  date: string,
  start: string = '09:00',
  end: string = '17:00'
): UnavailableTimeSlot {
  return {
    id: generateUnavailabilitySlotId(),
    date,
    start,
    end
  };
}

/**
 * Creates a formatted description of the unavailability slot
 */
export function formatUnavailabilitySlotDescription(slot: UnavailableTimeSlot): string {
  return `${slot.date} from ${formatTimeToAMPM(slot.start)} to ${formatTimeToAMPM(slot.end)}`;
} 