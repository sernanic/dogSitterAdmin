-- Add serviceType column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_type INTEGER DEFAULT 1;

-- Add comment to explain service types
COMMENT ON COLUMN profiles.service_type IS 'Service type: 1 = walking/boarding, 2 = grooming';

-- Create index for faster lookups by service type
CREATE INDEX IF NOT EXISTS idx_profiles_service_type ON profiles(service_type);

-- Create grooming_info table to store grooming rates by dog size
CREATE TABLE IF NOT EXISTS grooming_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  small_dog_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  medium_dog_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  large_dog_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT grooming_info_sitter_id_key UNIQUE (sitter_id)
);

-- Create index for faster lookups by sitter_id
CREATE INDEX IF NOT EXISTS grooming_info_sitter_id_idx ON grooming_info(sitter_id);

-- Add updated_at trigger
CREATE TRIGGER set_grooming_info_updated_at
BEFORE UPDATE ON grooming_info
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE grooming_info ENABLE ROW LEVEL SECURITY;

-- Create policies for grooming_info
-- Allow sitters to view their own grooming rates
CREATE POLICY "Sitters can view their own grooming rates"
  ON grooming_info
  FOR SELECT
  USING (auth.uid() = sitter_id);

-- Allow sitters to update their own grooming rates
CREATE POLICY "Sitters can update their own grooming rates"
  ON grooming_info
  FOR UPDATE
  USING (auth.uid() = sitter_id);

-- Allow sitters to insert their own grooming rates
CREATE POLICY "Sitters can insert their own grooming rates"
  ON grooming_info
  FOR INSERT
  WITH CHECK (auth.uid() = sitter_id);

-- Allow public read access to all grooming rates (for booking purposes)
CREATE POLICY "Anyone can view all grooming rates"
  ON grooming_info
  FOR SELECT
  USING (true);

-- Create function to initialize grooming info when a groomer profile is created
CREATE OR REPLACE FUNCTION initialize_grooming_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create grooming_info for groomers (service_type = 2)
  IF NEW.service_type = 2 THEN
    INSERT INTO grooming_info (sitter_id)
    VALUES (NEW.id)
    ON CONFLICT (sitter_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize grooming info when service type changes to grooming
DROP TRIGGER IF EXISTS on_service_type_change ON profiles;
CREATE TRIGGER on_service_type_change
AFTER INSERT OR UPDATE OF service_type ON profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_grooming_info(); 