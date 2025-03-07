import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getDirectSitterAvailability } from '../lib/availability';

// Create a simple debounce utility for API calls
// This is more reliable than a simple flag
let fetchTimer: any = null;
const fetchDebounceMS = 1000; // 1 second debounce

interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

interface Availability {
  [day: string]: TimeSlot[];
}

interface SaveResult {
  success: boolean;
  error?: string;
}

interface AvailabilityState {
  availability: Availability | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedId: string | null; // Track which user we last fetched for
  
  // Actions
  setAvailability: (availability: Availability) => void;
  fetchAvailability: (userId: string) => Promise<void>;
  saveAvailability: (userId: string, availability: Availability) => Promise<SaveResult>;
}

export const useAvailabilityStore = create<AvailabilityState>((set, get) => ({
  availability: null,
  isLoading: false,
  error: null,
  lastFetchedId: null,
  
  setAvailability: (availability) => set({ availability }),
  
  fetchAvailability: async (userId) => {
    // Get current state
    const { isLoading, lastFetchedId } = get();
    
    // Don't fetch if already loading
    if (isLoading) {
      console.log('[Store] Already loading, ignoring fetch request');
      return;
    }
    
    // Don't fetch if we just fetched for this user recently
    if (lastFetchedId === userId && fetchTimer) {
      console.log('[Store] Recently fetched for this user, debouncing request');
      return;
    }
    
    // Clear any existing timer
    if (fetchTimer) {
      clearTimeout(fetchTimer);
    }
    
    try {
      // Set loading state
      set({ isLoading: true, error: null });
      
      console.log(`[Store] Fetching availability for user ${userId.slice(0, 8)}...`);
      const { data, error } = await getDirectSitterAvailability(userId);
      
      if (error) {
        console.error('[Store] Error fetching availability:', error);
        // Even if there's an error, provide empty availability
        set({ 
          error: error,
          isLoading: false,
          lastFetchedId: userId,
          availability: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          }
        });
      } else {
        const isEmpty = !data || Object.values(data).every(slots => !slots.length);
        console.log(`[Store] Successfully fetched availability, empty? ${isEmpty}`);
        
        // Update state with fetched data
        set({ 
          availability: data || {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          }, 
          isLoading: false,
          lastFetchedId: userId
        });
      }
      
      // Set a timer to allow fetching again after delay
      fetchTimer = setTimeout(() => {
        fetchTimer = null;
      }, fetchDebounceMS);
      
    } catch (error: any) {
      console.error('[Store] Error in fetchAvailability:', error);
      // Even on error, provide empty availability and turn off loading
      set({ 
        error: error.message || 'Failed to load availability',
        isLoading: false,
        lastFetchedId: userId,
        availability: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      });
    }
  },
  
  saveAvailability: async (userId, availability) => {
    try {
      set({ isLoading: true, error: null });
      console.log('[Store] Starting availability save process...');
      
      // Delete all existing slots for the user FIRST and wait for it to complete
      console.log('[Store] Deleting existing availability records...');
      const { error: deleteError } = await supabase
        .from('sitter_weekly_availability')
        .delete()
        .eq('sitter_id', userId);
      
      if (deleteError) {
        console.error('[Store] Error deleting existing slots:', deleteError);
        throw deleteError;
      }
      
      console.log('[Store] Successfully deleted existing records, now adding new ones');
      
      // After deletion completes, insert new slots for each day
      const insertPromises = [];
      
      // Then insert new slots for each day
      for (const [dayName, slots] of Object.entries(availability)) {
        if (!slots || slots.length === 0) continue;
        
        // Map day names to weekday numbers (1-7, where 1 is Monday and 7 is Sunday)
        const dayMap: Record<string, number> = {
          monday: 1, 
          tuesday: 2, 
          wednesday: 3, 
          thursday: 4, 
          friday: 5, 
          saturday: 6, 
          sunday: 7
        };
        
        const dayNumber = dayMap[dayName.toLowerCase()];
        if (!dayNumber) {
          console.warn(`[Store] Invalid day name: ${dayName}, skipping`);
          continue;
        }
        
        console.log(`[Store] Adding ${slots.length} slots for ${dayName} (day ${dayNumber})`);
        
        // For each slot in the day
        for (const slot of slots) {
          const insertPromise = supabase.rpc('insert_sitter_weekly_availability', {
            p_sitter_id: userId,
            p_weekday: dayNumber,
            p_start_time: `${slot.start}:00`,
            p_end_time: `${slot.end}:00`,
          });
          
          insertPromises.push(insertPromise);
        }
      }
      
      // Now wait for all insert operations to complete
      console.log(`[Store] Executing ${insertPromises.length} insert operations...`);
      const results = await Promise.all(insertPromises);
      
      // Check for insert errors
      const insertErrors = results.filter(result => result.error);
      if (insertErrors.length > 0) {
        console.error('[Store] Errors during insert operations:', insertErrors);
        throw insertErrors[0].error;
      }
      
      // Update local state
      console.log('[Store] All operations completed successfully');
      set({ availability, isLoading: false, lastFetchedId: userId });
      
      return { success: true };
    } catch (error: any) {
      console.error('[Store] Error saving availability:', error);
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
})); 