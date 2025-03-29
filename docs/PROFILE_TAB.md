# Profile Tab Documentation

## Overview

The Profile tab serves as the central hub for user account management in the DogSitter Admin application. It provides a comprehensive interface for users to manage their personal information, availability settings, address information, and payment setup (exclusive to sitters). This document outlines the architecture, components, and functionality of the Profile tab.

## Architecture

The Profile tab is built using several modular components that work together to provide a seamless user experience. The main components include:

1. **ProfileContent**: The core component that orchestrates the entire Profile tab functionality
2. **ProfileHeader and ProfileAvatar**: Components for displaying and updating user profile information
3. **PersonalInfo**: Component for displaying user's personal information
4. **AccountSettings**: Component for managing various account settings
5. **Modal Components**: Various modal components for editing specific aspects of the profile

## Component Breakdown

### ProfileContent (Main Controller)

`ProfileContent.tsx` is the primary component that serves as the controller for the Profile tab. This component:

- Manages the state of all modal components
- Handles user authentication and session management
- Coordinates profile updates and data synchronization
- Manages profile image uploads and updates
- Orchestrates interactions between child components

Key functionalities:
- Uses Zustand store (`useAuthStore`) for auth state management
- Refreshes session data on component mount to ensure latest user data
- Loads primary address information
- Manages modal visibility for various settings screens
- Handles profile updates including image uploads

### ProfileAvatar

`ProfileAvatar.tsx` is responsible for displaying the user's profile picture and handling image updates. This component:

- Displays the user's avatar with appropriate styling
- Provides a UI for updating the profile picture
- Shows loading states during image uploads

### PersonalInfo

`PersonalInfo.tsx` displays the user's personal information in a structured format. This component:

- Shows user's email address
- Displays phone number with appropriate formatting
- Shows the primary address with an option to edit
- Uses a clean UI with icons for better visual hierarchy

### AccountSettings

`AccountSettings.tsx` provides access to various account management options. This component:

- Lists all available account settings options
- Handles navigation to different settings screens
- Shows or hides features based on user role (e.g., Payment Setup for sitters only)
- Uses event registration system to communicate with modal components

Options include:
- Edit Profile
- Manage Addresses
- Set Availability
- Set Unavailability
- Notifications (placeholder)
- Privacy & Security (placeholder)
- Payment Setup (sitters only)

### LogoutButton

`LogoutButton.tsx` provides a simple way for users to log out of the application. This component:

- Handles the logout action
- Redirects users to the authentication screen after logout
- Uses Zustand store for auth state management

### Modal Components

#### EditProfileModal

`EditProfileModal.tsx` provides a form for users to update their profile information. This component:

- Pre-populates form with current user data
- Validates form inputs
- Handles form submission and error reporting
- Provides UI feedback during submission
- Fields include: name, email (non-editable), and phone number

#### AddressManagerModal

`AddressManagerModal.tsx` allows users to manage their addresses. This component:

- Shows the primary address
- Allows adding, editing, and deleting addresses
- Facilitates setting a primary address
- Integrates with location services

#### AvailabilityManager and AvailabilityManagerModal

The availability management system consists of two key components:

1. `AvailabilityManager.tsx`: Core logic for managing availability time slots
2. `AvailabilityManagerModal.tsx`: Modal interface for the availability manager

These components work together to:
- Allow users to set weekly recurring availability for services
- Manage time slots with validation for overlaps
- Provide predefined slots for convenience (Morning, Afternoon, Evening)
- Support day-based collapsible sections for better organization
- Allow saving customized availability settings

Key features:
- Day-by-day time slot management
- Validation to prevent overlapping time slots
- Predefined time slots for quick selection
- Responsive time picker that adapts to platform (iOS/Android)
- Persistence of availability data through the Zustand store and Supabase

#### UnavailabilityManager and UnavailabilityManagerModal

Similar to the availability management, these components allow users to:
- Mark specific dates as unavailable
- Prevent booking conflicts
- Manage exceptions to regular availability
- Block out vacation days or personal time

#### PaymentSetupModal

`PaymentSetupModal.tsx` is exclusively available to sitters and provides interface for:
- Setting up Stripe Connect account
- Managing payment information
- Checking account status
- Completing Stripe onboarding

This component integrates with Stripe Connect to enable payments to sitters and features:
- Status tracking of Stripe account setup
- Onboarding flow integration
- Error handling for setup issues
- User-friendly instructions for payment setup

## State Management

The Profile tab uses a combination of local component state and global application state:

1. **Local State**: Each component maintains its own UI state (modal visibility, form values, etc.)
2. **Global State**: Zustand stores manage authentication, user data, and availability information

Key stores:
- `useAuthStore`: Manages user authentication, profile data, and session information
- `useAvailabilityStore`: Manages availability time slots and synchronization with backend

## Data Flow

1. User data is loaded from Supabase via the auth store when the profile tab mounts
2. When users update their profile, the changes are:
   - Sent to Supabase for persistence
   - Updated in the auth store
   - Reflected in the UI components
3. Modal components communicate with parent components via callbacks and event registration

## Integration Points

The Profile tab integrates with several key system components:

1. **Authentication System**: Via the auth store for user data and session management
2. **Supabase Backend**: For data persistence and retrieval
3. **Image Picker**: For avatar image selection and uploads
4. **Stripe Connect**: For payment processing setup (sitters only)
5. **Event Registration System**: For cross-component communication

## Error Handling

The Profile tab implements several error handling strategies:

1. Form validation with user feedback
2. API error catching and display
3. Fallback UI for network issues
4. Loading states to indicate processing

## Styling

The Profile tab uses a consistent styling approach with:

1. Shared stylesheets for common elements
2. Platform-specific adaptations where needed
3. Responsive design patterns for different screen sizes
4. Accessibility considerations in color contrast and touch targets

## Conclusion

The Profile tab is a comprehensive and modular system for user account management. Its architecture follows best practices for React Native development, including component separation, state management, and responsive design. The tab provides a seamless user experience for managing personal information, availability, addresses, and payment settings.
