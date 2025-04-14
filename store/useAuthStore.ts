import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, upsertProfile, getProfileById, uploadAvatar, updateAvatarUrl } from '../lib/supabase';

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

interface AuthState {
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
  refreshSession: () => Promise<void>;
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
                console.error('Error accessing profile after sign-up:', profileError);
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
          console.error('Registration failed:', error);
          throw error;
        }
      },
      
      logout: async () => {
        try {
          // Use Supabase to sign out
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          
          // Clear all state immediately
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isUploading: false,
          });

          // Force clear persisted state
          await AsyncStorage.removeItem('auth-storage');
        } catch (error) {
          console.error('Logout failed:', error);
          // Still clear state even if Supabase logout fails
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isUploading: false,
          });
          throw error;
        }
      },
      
      updateUser: async (userData: Partial<User>) => {
        try {
          // Get current state
          const currentState = get();
          
          if (!currentState.user) {
            console.error('Cannot update user: No user is logged in');
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
            console.error('Error updating profile:', error);
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
          console.error('Failed to update user:', error);
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
          console.error('Update avatar failed:', error);
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
            console.error('Error getting session:', error);
            // Even on error, mark as initialized but not authenticated
            set({ isAuthenticated: false, user: null, token: null });
            throw error; // Propagate error if needed elsewhere
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
                  });
                }
              } catch (profileFetchError) {
                 console.error('Unexpected error fetching profile during refresh:', profileFetchError);
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
                  });
              }
            } else {
              // User is already set and matches session, just update token potentially
              set({ token: data.session.access_token });
            }
          } else if (currentState.isAuthenticated) {
            // No session, but store thinks user is logged in - clear state
            console.log('No session found, clearing authenticated state.');
            set({
              isAuthenticated: false,
              user: null,
              token: null,
            });
          } else {
            // No session, and store already shows logged out - state is consistent
            console.log('No session found, state already reflects logged out.');
          }
        } catch (error) {
          console.error('Session refresh failed:', error);
          // Only clear auth state on error if currently authenticated
          // (getSession error was already handled above)
          // set({ isAuthenticated: false, user: null, token: null });
          // Re-throw? Or just log?
          // throw error;
        } finally {
           console.log('Session refresh process complete. Marking as initialized.');
           set({ isInitialized: true }); // <-- Mark as initialized
        }
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
      }),
    }
  )
); 