-- This file contains SQL statements to set up your Supabase database for the PawSitter app
-- Run these statements in your Supabase SQL Editor

-- 1. Create or replace the function for profile creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT DEFAULT 'sitter',
  user_avatar_url TEXT DEFAULT NULL,
  user_bio TEXT DEFAULT NULL,
  user_location TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This is important for bypassing RLS
AS $$
DECLARE
  profile_data JSONB;
BEGIN
  -- Insert into the profiles table
  INSERT INTO public.profiles (id, name, email, role, avatar_url, bio, location)
  VALUES (
    user_id,
    user_name,
    user_email,
    user_role,
    user_avatar_url,
    user_bio,
    user_location
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    updated_at = now()
  RETURNING to_jsonb(profiles.*) INTO profile_data;
  
  RETURN profile_data;
END;
$$;

-- 2. Ensure the profiles table has the right structure (if it doesn't already)
-- If you already have a profiles table, you may need to modify this statement
-- or run ALTER TABLE statements instead
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sitter',
  avatar_url TEXT,
  bio TEXT,
  location TEXT
);

-- 3. Set up Row Level Security policies
-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read any profile
CREATE POLICY "Anyone can read profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Create a trigger to automatically create a profile when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, avatar_url, bio, location)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    'sitter', -- Always set role to 'sitter' for new users
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'location'
  );
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create a trigger to keep the profile updated when a user is updated
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    name = coalesce(NEW.raw_user_meta_data->>'name', profiles.name),
    role = coalesce(NEW.raw_user_meta_data->>'role', profiles.role),
    avatar_url = coalesce(NEW.raw_user_meta_data->>'avatar_url', profiles.avatar_url),
    bio = coalesce(NEW.raw_user_meta_data->>'bio', profiles.bio),
    location = coalesce(NEW.raw_user_meta_data->>'location', profiles.location),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 4. Set up Storage for avatars
-- Note: This must be executed through the Supabase dashboard or API
-- These are instructions, not SQL commands:
/*
1. Go to the Supabase dashboard
2. Navigate to Storage > Buckets
3. Create a new bucket named 'avatars'
4. Set the bucket to public or create the following policies:
*/

-- Policy for users to read any avatar (if using RLS)
-- INSERT THIS IN THE SUPABASE DASHBOARD FOR THE 'avatars' BUCKET:
-- Policy name: "Anyone can view avatars"
-- Policy definition: (bucket_id = 'avatars')
-- Operation: SELECT
-- Using expression: true

-- Policy for users to upload their own avatar (if using RLS)
-- INSERT THIS IN THE SUPABASE DASHBOARD FOR THE 'avatars' BUCKET:
-- Policy name: "Authenticated users can upload avatars"
-- Policy definition: (bucket_id = 'avatars')
-- Operation: INSERT
-- Using expression: (auth.role() = 'authenticated')

-- Policy for users to update their own avatar (if using RLS)
-- INSERT THIS IN THE SUPABASE DASHBOARD FOR THE 'avatars' BUCKET:
-- Policy name: "Users can update their own avatars"
-- Policy definition: (bucket_id = 'avatars')
-- Operation: UPDATE
-- Using expression: (auth.uid() = owner)
