import { create } from 'zustand';
import { fetchUserUnavailability, saveUserUnavailability } from '../lib/unavailability';

export interface MarkedDateData {
  selected: boolean;
  selectedColor: string;
  // Add other properties if needed by react-native-calendars (e.g., disabled, dotColor)
}

export type SimpleDateUnavailability = { [date: string]: MarkedDateData };

interface UnavailabilityState {
  unavailability: SimpleDateUnavailability;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUnavailability: (unavailability: SimpleDateUnavailability) => void;
  fetchUnavailability: (userId: string) => Promise<void>;
  saveUnavailability: (userId: string, unavailability: SimpleDateUnavailability) => Promise<boolean>;
  clearUnavailability: () => void;
}

export const useUnavailabilityStore = create<UnavailabilityState>((set, get) => ({
  unavailability: {},
  isLoading: false,
  error: null,
  
  setUnavailability: (unavailability) => set({ unavailability }),
  
  fetchUnavailability: async (userId) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('[useUnavailabilityStore] Starting fetch for user:', userId);
      const fetchedUnavailability = await fetchUserUnavailability(userId); 
      
      if (!fetchedUnavailability) {
        console.warn('[useUnavailabilityStore] Fetch returned null or empty data');
        set({ 
          unavailability: {}, 
          isLoading: false,
          // Optionally set an error message here if needed
          // error: 'Failed to fetch unavailability data' 
        });
        return; // Exit early
      }
      
      console.log('[useUnavailabilityStore] Fetch completed, updating state with:', fetchedUnavailability);
      set({ 
        unavailability: fetchedUnavailability, // Use the fetched map directly
        isLoading: false 
      });
      console.log('[useUnavailabilityStore] State updated, isLoading set to false');
      
    } catch (error) {
      console.log('[useUnavailabilityStore] Fetch error:', error);
      set({ 
        error: 'Failed to load your unavailability data. Please try again.',
        isLoading: false,
        unavailability: {} // Set empty data on error to allow UI to proceed
      });
      console.log('[useUnavailabilityStore] Error state set, isLoading set to false');
    }
  },
  
  saveUnavailability: async (userId, unavailability) => {
    set({ isLoading: true, error: null });
    
    try {
      const success = await saveUserUnavailability(userId, unavailability);
      
      if (!success) {
        throw new Error('Save operation indicated failure');
      }
      
      console.log('[useUnavailabilityStore] Save successful, updating state');
      set({ 
        unavailability: unavailability, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      console.log('Failed to save unavailability', error);
      set({ 
        error: 'Failed to save your unavailability data. Please try again.',
        isLoading: false
      });
      return false;
    }
  },
  
  clearUnavailability: () => {
    set({ unavailability: {} });
  }
}));