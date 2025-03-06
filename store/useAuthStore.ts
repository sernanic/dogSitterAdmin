import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, upsertProfile, getProfileById, uploadAvatar, updateAvatarUrl } from '../lib/supabase';

export type UserRole = 'sitter';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  location?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isUploading: boolean;
  
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
      
      login: async (email: string, password: string) => {
        try {
          // Convert email to lowercase before login
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
          });
          
          if (error) throw error;
          
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
            console.error('Error fetching profile:', profileError);
            throw profileError;
          }
          
          console.log('Profile data retrieved:', JSON.stringify(profile, null, 2));
          
          // Set authenticated state with complete user data
          set({
            isAuthenticated: true,
            user: {
              id: data.user.id,
              name: profile.name,
              email: data.user.email || '',
              role: 'sitter', // Always enforce sitter role
              avatar_url: profile.avatar_url || '',
              phone: profile.phone || '',
              location: profile.location || '',
            },
            token: data.session?.access_token || null,
          });
        } catch (error) {
          console.error('Login failed:', error);
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
              redirectTo: 'pawsitter://auth/callback',
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
                role: 'sitter',
              },
            },
          });
          
          if (error) throw error;
          
          if (data.user) {
            // Immediately update the profile to ensure it's a sitter
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                role: 'sitter',
                name,
                email: data.user.email,
                phone: '',
                location: '',
                updated_at: new Date().toISOString()
              })
              .eq('id', data.user.id);

            if (updateError) {
              console.error('Error updating profile:', updateError);
              throw new Error('Failed to set up sitter account');
            }

            // Add a small delay to ensure database consistency
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify the profile was updated correctly
            const { data: profile, error: verifyError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (verifyError) {
              console.error('Error verifying profile:', verifyError);
              throw new Error('Failed to verify sitter account');
            }

            if (profile.role !== 'sitter') {
              throw new Error('Failed to set up sitter account properly');
            }

            // Check if we have a session (auto-confirm is enabled)
            if (data.session) {
              console.log('User registered and automatically signed in');
              
              set({
                isAuthenticated: true,
                user: {
                  id: data.user.id,
                  name,
                  email: data.user.email || '',
                  role: 'sitter',
                  avatar_url: profile.avatar_url || '',
                  phone: profile.phone || '',
                  location: profile.location || '',
                },
                token: data.session.access_token,
              });
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
          
          set({
            isAuthenticated: false,
            user: null,
            token: null,
          });
        } catch (error) {
          console.error('Logout failed:', error);
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
          
          // Updates the profile in the database
          await supabase.from('profiles').update({
            name: userData.name,
            role: userData.role,
            avatar_url: userData.avatar_url,
            phone: userData.phone,
            location: userData.location,
          }).eq('id', currentState.user.id);
          
          // Update the store with new user data
          set({
            user: {
              ...currentState.user,
              ...userData
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
        try {
          const currentState = get();
          
          // Check current session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (data.session) {
            const { user } = data.session;
            
            // Only update if new session differs from current state
            if (!currentState.isAuthenticated || currentState.user?.id !== user.id) {
              try {
                // Get profile data - explicitly request all fields including avatar_url
                console.log('Fetching profile data for user:', user.id);
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*') // Select all fields
                  .eq('id', user.id)
                  .single();
                
                if (profileError) {
                  throw profileError;
                }
                
                console.log('Profile data retrieved:', JSON.stringify(profile, null, 2));
                
                // Set state with complete profile data
                set({
                  isAuthenticated: true,
                  user: {
                    id: user.id,
                    name: profile.name,
                    email: user.email || '',
                    role: profile.role || 'sitter',
                    avatar_url: profile.avatar_url || '',
                    phone: profile.phone || '',
                    location: profile.location || '',
                  },
                  token: data.session.access_token,
                });
              } catch (profileError) {
                // Profile might not exist yet if user just signed up with OAuth
                console.warn('Profile fetch failed:', profileError);
                
                // Only set new state if it's different from current state
                if (!currentState.isAuthenticated || currentState.user?.id !== user.id) {
                  // Set minimal user data
                  set({
                    isAuthenticated: true,
                    user: {
                      id: user.id,
                      name: user.user_metadata?.name || user.user_metadata?.full_name || '',
                      email: user.email || '',
                      role: 'sitter', // Default role
                      avatar_url: '', // Remove reference to non-existent profile
                      phone: '',
                      location: '',
                    },
                    token: data.session.access_token,
                  });
                }
              }
            }
          } else if (currentState.isAuthenticated) {
            // Only update if current state is authenticated but there's no session
            set({
              isAuthenticated: false,
              user: null,
              token: null,
            });
          }
        } catch (error) {
          console.error('Session refresh failed:', error);
          // Only clear auth state on error if currently authenticated
          const currentState = get();
          if (currentState.isAuthenticated) {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
            });
          }
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