import { 
  supabase, 
  getSitterUnavailableDates,
  clearSitterUnavailableDates,
  addSitterUnavailableDate,
  SitterUnavailability 
} from './supabase';
import { MarkedDateData, SimpleDateUnavailability } from '../store/useUnavailabilityStore';

// --- Utility Functions ---

/**
 * Gets today's date as 'YYYY-MM-DD'
 */
export function getCurrentDate(): string {
  return formatDateToString(new Date());
}

/**
 * Formats a Date object or timestamp number to 'YYYY-MM-DD' string
 */
export function formatDateToString(date: Date | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats the simplified unavailability data for the react-native-calendars markedDates prop.
 * This function might be redundant if the state already holds the correct format.
 * Kept for clarity or potential future adjustments.
 */
export function formatUnavailabilityForCalendar(
  unavailability: SimpleDateUnavailability
): { [date: string]: MarkedDateData } {
  // The state already matches the required format, so just return it.
  // Add any additional processing if needed (e.g., marking today's date).
  console.log('[formatUnavailabilityForCalendar] Formatting:', unavailability);
  return unavailability;
}

// --- Database Interaction Functions ---

/**
 * Fetches a sitter's unavailable dates from Supabase and formats them 
 * into the SimpleDateUnavailability structure for the store.
 */
export async function fetchUserUnavailability(userId: string): Promise<SimpleDateUnavailability | null> {
  try {
    console.log('[fetchUserUnavailability] Starting fetch for user:', userId);
    
    // Use the imported helper function directly
    const unavailableDateRecords = await getSitterUnavailableDates(userId);
    
    if (!unavailableDateRecords) {
      console.warn('[fetchUserUnavailability] Supabase helper returned null/undefined');
      return {}; // Return empty object on failure/no data
    }
    
    console.log(`[fetchUserUnavailability] Received ${unavailableDateRecords.length} unavailable date records`);
    
    // Convert the database response to the SimpleDateUnavailability format
    const unavailabilityMap: SimpleDateUnavailability = {};
    
    unavailableDateRecords.forEach((item: SitterUnavailability) => {
      if (item.unavailable_date) {
        const date = item.unavailable_date; // Assuming YYYY-MM-DD string from DB
        console.log(`[fetchUserUnavailability] Processing date: ${date}`);
        unavailabilityMap[date] = { 
          selected: true, 
          selectedColor: '#f44336' // Or your desired color for unavailable dates
        };
      } else {
        console.warn('[fetchUserUnavailability] Found record without unavailable_date:', item);
      }
    });
    
    console.log(`[fetchUserUnavailability] Processed map:`, unavailabilityMap);
    return unavailabilityMap;
    
  } catch (error) {
    console.error('[fetchUserUnavailability] Fatal error:', error);
    return null; // Indicate error, store will handle setting state
  }
}

/**
 * Saves a sitter's unavailability dates to the database.
 * Clears existing dates and inserts the new set.
 */
export async function saveUserUnavailability(
  userId: string,
  unavailability: SimpleDateUnavailability // Use the simplified type
): Promise<boolean> { // Return boolean success indicator
  try {
    const unavailableDates = Object.keys(unavailability).filter(date => unavailability[date]?.selected);
    
    console.log(`[saveUserUnavailability] Saving ${unavailableDates.length} unavailable dates for user ${userId}:`, unavailableDates);
    
    // 1. Clear all existing unavailability records for this sitter
    // Use the imported helper function directly
    await clearSitterUnavailableDates(userId);
    
    // 2. Insert the new set of unavailable dates
    if (unavailableDates.length > 0) {
      console.log('[saveUserUnavailability] Adding new unavailable dates:', unavailableDates);
      
      // Prepare records for bulk insert if preferred, or insert one by one
      // Use the imported helper function directly
      const insertPromises = unavailableDates.map(date => 
        addSitterUnavailableDate(userId, date)
      );
      
      // Wait for all insertions to complete
      await Promise.all(insertPromises);
      
      console.log('[saveUserUnavailability] All dates inserted.');
    } else {
      console.log('[saveUserUnavailability] No unavailable dates selected, clearing only.');
    }
    
    console.log('[saveUserUnavailability] Unavailability saved successfully');
    return true; // Indicate success
    
  } catch (error) {
    console.error('[saveUserUnavailability] Error:', error);
    return false; // Indicate failure
  }
}