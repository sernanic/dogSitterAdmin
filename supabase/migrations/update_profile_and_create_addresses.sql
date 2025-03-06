-- Update profiles table to add or rename phone column to phoneNumber
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
DROP COLUMN IF EXISTS "phone"; -- Drop the old column if it exists

-- Create addresses table with geolocation data
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  formatted_address TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by profile_id
CREATE INDEX IF NOT EXISTS idx_addresses_profile_id ON addresses(profile_id);

-- Create RLS (Row Level Security) policies for addresses table
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own addresses
CREATE POLICY "Users can read their own addresses"
  ON addresses FOR SELECT
  USING (profile_id IN (
    SELECT id FROM profiles
    WHERE id = auth.uid()
  ));

-- Policy to allow users to insert their own addresses
CREATE POLICY "Users can insert their own addresses"
  ON addresses FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Policy to allow users to update their own addresses
CREATE POLICY "Users can update their own addresses"
  ON addresses FOR UPDATE
  USING (profile_id = auth.uid());

-- Policy to allow users to delete their own addresses
CREATE POLICY "Users can delete their own addresses"
  ON addresses FOR DELETE
  USING (profile_id = auth.uid());

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at field
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 