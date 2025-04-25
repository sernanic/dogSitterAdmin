import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  getDirectSitterAvailability, 
  identifyChangedTimeSlots
} from '../lib/availability';

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
        console.log('[Store] Error fetching availability:', error);
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
      console.log('[Store] Error in fetchAvailability:', error);
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
  
  saveAvailability: async (userId, updatedAvailability) => {
    try {
      set({ isLoading: true, error: null });
      console.log('[Store] Starting optimized availability save process...');
      
      // First, fetch the current availability from database to compare
      console.log('[Store] Fetching current availability for comparison...');
      const { data: currentAvailability, error: fetchError } = await getDirectSitterAvailability(userId);
      
      if (fetchError) {
        console.log('[Store] Error fetching current availability:', fetchError);
        throw fetchError;
      }
      
      // Process each day with a smarter strategy
      const dayPromises = [];
      
      for (const dayName of Object.keys(updatedAvailability)) {
        const dayKey = dayName.toLowerCase();
        const updatedSlots = updatedAvailability[dayKey as keyof typeof updatedAvailability] || [];
        
        // Safely access current slots with type checking
        const currentSlots = currentAvailability && 
          dayKey in currentAvailability ? 
          (currentAvailability as any)[dayKey] || [] : 
          [];
        
        // Analyze what changed between current and updated slots
        const changes = identifyChangedTimeSlots(currentSlots, updatedSlots);
        console.log(`[Store] Day ${dayName}: ${changes.added.length} added, ${changes.modified.length} modified, ${changes.removed.length} removed, ${changes.unchanged.length} unchanged`);
        
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
        
        const dayNumber = dayMap[dayKey];
        if (!dayNumber) {
          console.warn(`[Store] Invalid day name: ${dayName}, skipping`);
          continue;
        }
        
        // Step 1: Delete removed slots
        if (changes.removed.length > 0) {
          for (const slot of changes.removed) {
            const deletePromise = supabase
              .from('sitter_weekly_availability')
              .delete()
              .eq('id', slot.id)
              .eq('sitter_id', userId);
            
            dayPromises.push(deletePromise);
          }
        }
        
        // Step 2: Delete modified slots (we'll re-add them with new times)
        if (changes.modified.length > 0) {
          for (const slot of changes.modified) {
            const deletePromise = supabase
              .from('sitter_weekly_availability')
              .delete()
              .eq('id', slot.id)
              .eq('sitter_id', userId);
            
            dayPromises.push(deletePromise);
          }
        }
        
        // Step 3: Add new slots and re-add modified slots
        const slotsToAdd = [...changes.added, ...changes.modified];
        for (const slot of slotsToAdd) {
          const insertPromise = supabase.rpc('insert_sitter_weekly_availability', {
            p_sitter_id: userId,
            p_weekday: dayNumber,
            p_start_time: `${slot.start}:00`,
            p_end_time: `${slot.end}:00`,
          });
          
          dayPromises.push(insertPromise);
        }
      }
      
      // Now execute all the operations
      console.log(`[Store] Executing ${dayPromises.length} database operations...`);
      const results = await Promise.all(dayPromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.log('[Store] Errors during operations:', errors);
        throw errors[0].error;
      }
      
      // Update local state
      console.log('[Store] All operations completed successfully');
      set({ availability: updatedAvailability, isLoading: false, lastFetchedId: userId });
      
      return { success: true };
    } catch (error: any) {
      console.log('[Store] Error saving availability:', error);
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
})); 