# PawSitter - Dog Sitter Admin App

A mobile application for pet sitters to manage their services, bookings, and client interactions.

## Features

- User authentication with Supabase (email/password and social login)
- Role-based access control (sitter, owner, admin)
- Profile management
- Booking management
- Client messaging
- Service listings

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Expo CLI
- Supabase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/dogSitterAdmin.git
   cd dogSitterAdmin
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   - Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   - Update the `.env` file with your Supabase credentials

4. Set up Supabase
   - Create a new Supabase project
   - Create a `profiles` table with the following schema:

   ```sql
   CREATE TABLE profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     email TEXT NOT NULL,
     name TEXT,
     role TEXT CHECK (role IN ('sitter', 'owner', 'admin')) DEFAULT 'sitter',
     avatar_url TEXT,
     bio TEXT,
     location TEXT
   );
   
   -- Enable Row Level Security
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   
   -- Create policies for access control
   CREATE POLICY "Profiles are viewable by the user who created them" 
     ON profiles FOR SELECT 
     USING (auth.uid() = id);
   
   CREATE POLICY "Users can insert their own profile" 
     ON profiles FOR INSERT 
     WITH CHECK (auth.uid() = id);
   
   CREATE POLICY "Users can update their own profile" 
     ON profiles FOR UPDATE 
     USING (auth.uid() = id);
   ```

5. Start the app
   ```bash
   npm run dev
   ```

## Authentication Flow

- Users can sign up with email/password
- Upon registration, a profile is created in the profiles table
- Default role is set to 'sitter'
- Authentication state is managed with Zustand and persisted

## Project Structure

- `/app` - Expo Router app directory
  - `/(tabs)` - Main tabs of the application
  - `/auth` - Authentication screens
- `/components` - Reusable components
  - `/auth` - Authentication related components
  - `/providers` - Context providers
- `/lib` - Shared utilities
  - `supabase.ts` - Supabase client and helpers
- `/store` - Zustand state management
  - `useAuthStore.ts` - Authentication state

## Technologies Used

- React Native
- Expo
- TypeScript
- Zustand (State Management)
- Supabase (Backend & Authentication)
- Expo Router (Navigation)
- Lucide React Native (Icons)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 