import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, upsertProfile, getProfileById, uploadAvatar, updateAvatarUrl, uploadProfileBackground, updateBackgroundUrl } from '../lib/supabase';
import { Session } from '@supabase/supabase-js'; // Import Session type

export type UserRole = 'sitter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  background_url?: string;
  phoneNumber?: string;
  location?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isUploading: boolean;
  isInitialized: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (provider: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<string>;
  updateBackground: (backgroundUri: string) => Promise<string>;
  refreshSession: () => Promise<void>;
  initializeAuthListener: () => void;
}

// Create store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isUploading: false,
      isInitialized: false,
      
      login: async (email: string, password: string) => {
        try {
          // Convert email to lowercase before login
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
          });
          
          if (error) {
            // For debugging purposes, but user will only see friendly message
            console.log('Login error from Supabase:', error);
            throw new Error('Invalid login credentials');
          }
          
          if (!data || !data.user) {
            throw new Error('Login successful but no user data returned');
          }
          
          // Get user profile from database
          console.log('Fetching profile for user:', data.user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*') // Select all fields including avatar_url
            .eq('id', data.user.id)
            .single();
            
          if (profileError) {
            console.log('Error fetching profile:', profileError);
            throw profileError;
          }
          
          // Ensure profile has sitter role, update if needed
          if (profile.role !== 'sitter') {
            console.warn('Profile role is not sitter, updating to sitter');
            await supabase
              .from('profiles')
              .update({ role: 'sitter' })
              .eq('id', data.user.id);
          }
          
          // Set authenticated state with complete user data
          set({
            isAuthenticated: true,
            user: {
              id: data.user.id,
              name: profile.name,
              email: data.user.email || '',
              role: 'sitter', // Always enforce sitter role
              avatar_url: profile.avatar_url || '',
              background_url: profile.background_url || '',
              phoneNumber: profile.phoneNumber || '',
              // Handle location field even if not in DB
              location: '',
            },
            token: data.session?.access_token || null,
          });
        } catch (error) {
          console.log('Login failed:', error);
          throw error;
        }
      },
      
      loginWithSocial: async (provider: string) => {
        try {
          const validProviders = ['google', 'facebook', 'twitter', 'apple'];
          
          if (!validProviders.includes(provider)) {
            throw new Error(`Unsupported provider: ${provider}`);
          }
          
          // Use Supabase OAuth
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider as any,
            options: {
              redirectTo: 'pikpup://auth/callback',
            },
          });
          
          if (error) throw error;
          
          // Note: For OAuth, we'll need to handle the session in another place
          // since this redirects the user away from the app
          
        } catch (error) {
          console.error(`${provider} login failed:`, error);
          throw error;
        }
      },
      
      register: async (name: string, email: string, password: string, role: UserRole = 'sitter') => {
        try {
          // First create the user
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                role: 'sitter', // Always set to sitter in auth metadata
              },
            },
          });
          
          if (error) throw error;
          
          if (data.user) {
            // In Supabase, there's usually a database trigger that creates the profile
            // We need to wait for auto-confirmation (or manual confirmation)
            // before we can modify the profile
            
            // Check if we have a session (auto-confirm is enabled)
            if (data.session) {
              console.log('User registered and automatically signed in');
              
              try {
                // Fetch the auto-created profile
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', data.user.id)
                  .single();
                
                if (profileError) {
                  console.warn('Could not fetch profile after registration:', profileError);
                  // We don't throw here to allow login to proceed
                }
                
                // If the profile exists and has wrong role, try to update it
                if (profile && profile.role !== 'sitter') {
                  console.log('Updating profile role to sitter');
                  
                  // The auth session has the RLS permissions to update the user's own profile
                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ 
                      role: 'sitter',
                      name: name || profile.name,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', data.user.id);
                    
                  if (updateError) {
                    console.warn('Could not update profile role:', updateError);
                    // Continue anyway - we'll set the role in the local state
                  }
                }
                
                // Set authenticated state
                set({
                  isAuthenticated: true,
                  user: {
                    id: data.user.id,
                    name: name,
                    email: data.user.email || '',
                    role: 'sitter', // Always set to sitter in state
                    avatar_url: profile?.avatar_url || '',
                    background_url: profile?.background_url || '',
                    phoneNumber: profile?.phoneNumber || '',
                    location: '',
                  },
                  token: data.session.access_token,
                });
              } catch (profileError) {
                console.log('Error accessing profile after sign-up:', profileError);
                // Still set the state with what we know
                set({
                  isAuthenticated: true,
                  user: {
                    id: data.user.id,
                    name: name,
                    email: data.user.email || '',
                    role: 'sitter',
                    avatar_url: '',
                    background_url: '',
                    phoneNumber: '',
                    location: '',
                  },
                  token: data.session.access_token,
                });
              }
            } else {
              // Email confirmation is required, user isn't authenticated yet
              console.log('Registration successful, email confirmation required');
              // Don't set as authenticated yet
            }
          } else {
            console.log('Unexpected registration response - no user object');
          }
          
        } catch (error) {
          console.log('Registration failed:', error);
          throw error;
        }
      },
      
      logout: async () => {
        try {
          console.log('useAuthStore: Initiating Supabase sign out.');
          // ONLY call Supabase sign out. Let the onAuthStateChange listener handle state update.
          const { error } = await supabase.auth.signOut();
          if (error) {
             console.error('useAuthStore: Supabase signOut error:', error);
             throw error; // Re-throw error
          }
          console.log('useAuthStore: Supabase sign out successful. Listener should update state.');
        } catch (error) {
          console.error('useAuthStore: Logout failed:', error);
          // DO NOT clear state here anymore, rely on listener or subsequent refresh.
          // Consider if an error here means the user is potentially still logged in on Supabase side.
          throw error; // Re-throw error to be caught by UI
        }
      },
      
      updateUser: async (userData: Partial<User>) => {
        try {
          // Get current state
          const currentState = get();
          
          if (!currentState.user) {
            console.log('Cannot update user: No user is logged in');
            return;
          }
          
          // Updates the profile in the database - only include fields that exist in the schema
          const { error } = await supabase.from('profiles').update({
            name: userData.name,
            role: 'sitter', // Always ensure role is sitter
            avatar_url: userData.avatar_url,
            background_url: userData.background_url,
            phoneNumber: userData.phoneNumber,
            // Do not include location field as it's not in database schema
          }).eq('id', currentState.user.id);
          
          if (error) {
            console.log('Error updating profile:', error);
            if (error.code === '42501') {
              // This is a RLS policy violation
              console.warn('RLS policy prevented profile update. You may need to reauthenticate.');
              throw new Error('Permission denied. Please log out and log back in.');
            }
            throw error;
          }
          
          // Update the store with new user data
          set({
            user: {
              ...currentState.user,
              ...userData,
              role: 'sitter', // Always enforce sitter role in state
            }
          });
        } catch (error) {
          console.log('Failed to update user:', error);
          throw error;
        }
      },
      
      updateAvatar: async (avatarUri: string) => {
        const currentUser = get().user;
        
        if (!currentUser) {
          throw new Error('No authenticated user');
        }
        
        // Set upload in progress
        set({ isUploading: true });
        
        try {
          console.log('Starting avatar update with URI:', avatarUri);
          
          // Upload avatar to Supabase storage
          const publicUrl = await uploadAvatar(currentUser.id, avatarUri);
          
          console.log('Avatar uploaded, updating profile with URL:', publicUrl);
          
          // Update profile with new avatar URL
          await updateAvatarUrl(currentUser.id, publicUrl);

          console.log('Profile updated with new avatar URL');

          // Update local state
          set((state) => ({
            user: state.user ? { ...state.user, avatar_url: publicUrl } : null,
            isUploading: false
          }));
          
          return publicUrl;
        } catch (error) {
          console.log('Update avatar failed:', error);
          // Reset uploading state on error
          set({ isUploading: false });
          
          // Rethrow with a more user-friendly message
          if (error instanceof Error) {
            throw new Error(`Failed to update profile picture: ${error.message}`);
          } else {
            throw new Error('Failed to update profile picture');
          }
        }
      },
      
      updateBackground: async (backgroundUri: string) => {
        const currentUser = get().user;
        
        if (!currentUser) {
          throw new Error('No authenticated user');
        }
        
        // Set upload in progress
        set({ isUploading: true });
        
        try {
          console.log('Starting background update with URI:', backgroundUri);
          
          // Upload background to Supabase storage
          const publicUrl = await uploadProfileBackground(currentUser.id, backgroundUri);
          
          console.log('Background uploaded, updating profile with URL:', publicUrl);
          
          // Update profile with new background URL
          await updateBackgroundUrl(currentUser.id, publicUrl);

          console.log('Profile updated with new background URL');

          // Update local state
          set((state) => ({
            user: state.user ? { ...state.user, background_url: publicUrl } : null,
            isUploading: false
          }));
          
          return publicUrl;
        } catch (error) {
          console.log('Update background failed:', error);
          // Reset uploading state on error
          set({ isUploading: false });
          
          // Rethrow with a more user-friendly message
          if (error instanceof Error) {
            throw new Error(`Failed to update background image: ${error.message}`);
          } else {
            throw new Error('Failed to update background image');
          }
        }
      },
      
      refreshSession: async () => {
        const currentState = get();
        // Optional: If already initialized and authenticated, maybe skip full refresh?
        // This depends on desired behavior.
        // if (currentState.isInitialized && currentState.isAuthenticated) {
        //   return;
        // }
        
        console.log('Attempting to refresh session...');
        try {
          const { data, error } = await supabase.auth.getSession();
          console.log('getSession response:', { data: !!data, error });

          if (error) {
            console.log('Error getting session:', error);
            // Even on error, mark as initialized but not authenticated
            set({ isAuthenticated: false, user: null, token: null, isInitialized: true }); // Ensure initialized is set
            // Don't throw error here, let the app load in logged-out state
            return; 
          }

          if (data.session) {
            console.log('Session found, user ID:', data.session.user.id);
            const user = data.session.user;
            // Fetch profile ONLY if session exists and user is not already set or differs
            if (!currentState.user || currentState.user.id !== user.id) {
              try {
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', user.id)
                  .single();

                if (profileError || !profile) {
                  console.warn('Profile fetch failed during refresh:', profileError?.message);
                  // If profile fetch fails, still set basic auth state from session
                  set({
                    isAuthenticated: true,
                    user: {
                      id: user.id,
                      name: user.user_metadata?.name || user.user_metadata?.full_name || '',
                      email: user.email || '',
                      role: 'sitter', // Default role
                      avatar_url: user.user_metadata?.avatar_url || '',
                      background_url: '',
                      phoneNumber: '',
                      location: '',
                    },
                    token: data.session.access_token,
                    isInitialized: true // Mark initialized
                  });
                } else {
                  // Set state with profile data
                  set({
                    isAuthenticated: true,
                    user: {
                      id: user.id,
                      name: profile.name,
                      email: user.email || '',
                      role: 'sitter', // Always enforce sitter role
                      avatar_url: profile.avatar_url || '',
                      background_url: profile.background_url || '',
                      phoneNumber: profile.phoneNumber || '',
                      location: profile.location || '',
                    },
                    token: data.session.access_token,
                    isInitialized: true // Mark initialized
                  });
                }
              } catch (profileFetchError) {
                 console.log('Unexpected error fetching profile during refresh:', profileFetchError);
                 // Fallback: Set basic auth state even if profile fetch crashes
                  set({
                    isAuthenticated: true,
                    user: {
                      id: user.id,
                      name: user.user_metadata?.name || user.user_metadata?.full_name || '',
                      email: user.email || '',
                      role: 'sitter', // Default role
                      avatar_url: user.user_metadata?.avatar_url || '',
                      background_url: '',
                      phoneNumber: '',
                      location: '',
                    },
                    token: data.session.access_token,
                    isInitialized: true // Mark initialized
                  });
              }
            } else {
              // User is already set and matches session, just update token potentially
              set({ token: data.session.access_token, isInitialized: true }); // Mark initialized
            }
          } else if (currentState.isAuthenticated) {
            // No session, but store thinks user is logged in - clear state
            console.log('No session found, clearing authenticated state.');
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isInitialized: true // Mark initialized
            });
          } else {
            // No session, and store already shows logged out - state is consistent
            console.log('No session found, state already reflects logged out.');
             set({ isInitialized: true }); // Mark initialized
          }
        } catch (error) {
          console.log('Session refresh failed:', error);
          // Mark as initialized even on failure
           set({ isAuthenticated: false, user: null, token: null, isInitialized: true });
        } 
        // Removed finally block as isInitialized is set in all paths now
      },

      initializeAuthListener: () => {
        // Prevent setting up multiple listeners if called again
        if (get().isInitialized) { 
          // Or use a dedicated flag like listenerActive
           // console.log('useAuthStore: Auth listener already initialized or setup.');
           // return;
        }
        console.log('useAuthStore: Initializing Supabase auth listener.');
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, session: Session | null) => {
             console.log(`useAuthStore: Supabase auth event: ${event}`, { session: !!session });

             // Set initialized true on the first event received from listener
             // We might receive INITIAL_SESSION first, or SIGNED_IN/OUT later
             if (!get().isInitialized) {
                 set({ isInitialized: true });
             }

             if (event === 'SIGNED_IN') {
                if (!session) return; // Should not happen for SIGNED_IN, but safeguard
                // Fetch profile when signed in
                try {
                    const { data: profile, error: profileError } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', session.user.id)
                      .single();

                    if (profileError || !profile) throw profileError || new Error('Profile not found');

                    set({
                      isAuthenticated: true,
                      user: {
                        id: session.user.id,
                        name: profile.name,
                        email: session.user.email || '',
                        role: profile.role || 'sitter', // Use profile role
                        avatar_url: profile.avatar_url || '',
                        background_url: profile.background_url || '',
                        phoneNumber: profile.phoneNumber || '',
                        location: profile.location || '',
                      },
                      token: session.access_token,
                      isInitialized: true // Ensure initialized is true
                    });
                } catch (error) {
                   console.error('useAuthStore: Error fetching profile on SIGNED_IN:', error);
                   // Fallback: Set basic auth state even if profile fetch fails
                   set({
                      isAuthenticated: true,
                      user: {
                        id: session.user.id,
                        name: session.user.user_metadata?.name || '',
                        email: session.user.email || '',
                        role: 'sitter',
                        avatar_url: session.user.user_metadata?.avatar_url || '',
                      },
                      token: session.access_token,
                      isInitialized: true // Ensure initialized is true
                   });
                }
             } else if (event === 'SIGNED_OUT') {
                console.log('useAuthStore: SIGNED_OUT detected, clearing auth state.');
                set({
                  isAuthenticated: false,
                  user: null,
                  token: null,
                  isInitialized: true // Ensure initialized is true
                });
             } else if (event === 'TOKEN_REFRESHED') {
                if (!session) return;
                console.log('useAuthStore: Token refreshed.');
                set({ token: session.access_token });
             } 
             // INITIAL_SESSION is implicitly handled now by the logic above
             // If session exists on INITIAL_SESSION, SIGNED_IN logic runs
             // If session is null on INITIAL_SESSION, SIGNED_OUT logic runs
          }
        );

        // Store the unsubscribe function if needed, though typically it runs for app lifetime
        // You might want to return listener.subscription.unsubscribe if you need to manually stop it
        console.log('useAuthStore: Auth listener setup complete.');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields to avoid issues
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        // DO NOT persist isInitialized or isUploading
      }),
    }
  )
);

// Call the initializer function immediately after creating the store
// This ensures the listener is active as soon as the store is used.
useAuthStore.getState().initializeAuthListener();