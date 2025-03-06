-- Enable Row Level Security on profiles table (in case it's not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Allow users to select their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Allow users to insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to select their own profile
CREATE POLICY "Allow users to select their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable anyone to insert profiles with RLS (this is important for new users)
CREATE POLICY "Allow authenticated users to insert profiles" 
ON profiles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'); 