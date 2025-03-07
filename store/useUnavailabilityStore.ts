import { create } from 'zustand';
import { UnavailableTimeSlot, DateUnavailability, fetchUserUnavailability, saveUserUnavailability } from '../lib/unavailability';

interface UnavailabilityState {
  unavailability: DateUnavailability;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUnavailability: (unavailability: DateUnavailability) => void;
  fetchUnavailability: (userId: string) => Promise<void>;
  saveUnavailability: (userId: string, unavailability: DateUnavailability) => Promise<boolean>;
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
      const response = await fetchUserUnavailability(userId);
      
      if (!response) {
        throw new Error('Failed to fetch unavailability data');
      }
      
      // Process the response and update the store
      console.log('[useUnavailabilityStore] Fetch completed, updating state');
      set({ 
        unavailability: response.unavailable_dates || {}, 
        isLoading: false 
      });
      console.log('[useUnavailabilityStore] State updated, isLoading set to false');
      
    } catch (error) {
      console.error('[useUnavailabilityStore] Fetch error:', error);
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
      const response = await saveUserUnavailability(userId, unavailability);
      
      if (!response) {
        throw new Error('Failed to save unavailability data');
      }
      
      // Update the store with the saved data
      set({ 
        unavailability: response.unavailable_dates || unavailability, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      console.error('Failed to save unavailability', error);
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