-- Alter the profiles table to add phoneNumber column
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Drop the old phone column if it exists (use a separate transaction to prevent errors)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles DROP COLUMN "phone";
  END IF;
END $$;

-- Create the addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  formatted_address TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create an index for faster lookups by profile_id
CREATE INDEX IF NOT EXISTS addresses_profile_id_idx ON addresses(profile_id);

-- Enable Row Level Security on addresses table
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create a policy for users to see their own addresses
CREATE POLICY "Users can view their own addresses"
  ON addresses
  FOR SELECT
  USING (
    auth.uid() = profile_id
  );

-- Create a policy for users to insert their own addresses
CREATE POLICY "Users can insert their own addresses"
  ON addresses
  FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
  );

-- Create a policy for users to update their own addresses
CREATE POLICY "Users can update their own addresses"
  ON addresses
  FOR UPDATE
  USING (
    auth.uid() = profile_id
  )
  WITH CHECK (
    auth.uid() = profile_id
  );

-- Create a policy for users to delete their own addresses
CREATE POLICY "Users can delete their own addresses"
  ON addresses
  FOR DELETE
  USING (
    auth.uid() = profile_id
  );

-- Create a trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before update
CREATE TRIGGER address_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION update_addresses_updated_at(); 