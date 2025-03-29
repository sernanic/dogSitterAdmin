-- Create sitterInfo table to store sitter rates for walking and boarding services
CREATE TABLE IF NOT EXISTS sitter_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  walking_rate_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  walking_rate_for_additional_dog DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  boarding_rate_per_day DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  boarding_rate_for_additional_dog DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  max_dogs_walking INTEGER NOT NULL DEFAULT 3,
  max_dogs_boarding INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sitter_info_sitter_id_key UNIQUE (sitter_id)
);

-- Create index for faster lookups by sitter_id
CREATE INDEX IF NOT EXISTS sitter_info_sitter_id_idx ON sitter_info(sitter_id);

-- Add updated_at trigger
CREATE TRIGGER set_sitter_info_updated_at
BEFORE UPDATE ON sitter_info
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE sitter_info ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow sitters to view their own rates
CREATE POLICY "Sitters can view their own rates"
  ON sitter_info
  FOR SELECT
  USING (auth.uid() = sitter_id);

-- Allow sitters to update their own rates
CREATE POLICY "Sitters can update their own rates"
  ON sitter_info
  FOR UPDATE
  USING (auth.uid() = sitter_id);

-- Allow sitters to insert their own rates
CREATE POLICY "Sitters can insert their own rates"
  ON sitter_info
  FOR INSERT
  WITH CHECK (auth.uid() = sitter_id);

-- Allow public read access to all sitter rates (for booking purposes)
CREATE POLICY "Anyone can view all sitter rates"
  ON sitter_info
  FOR SELECT
  USING (true);

-- Create function to initialize sitter info when a new sitter is created
CREATE OR REPLACE FUNCTION initialize_sitter_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create sitter_info for users with role 'sitter'
  IF NEW.role = 'sitter' THEN
    INSERT INTO sitter_info (sitter_id)
    VALUES (NEW.id)
    ON CONFLICT (sitter_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize sitter info when a new sitter is created or role changes to sitter
DROP TRIGGER IF EXISTS on_profile_insert_or_update ON profiles;
CREATE TRIGGER on_profile_insert_or_update
AFTER INSERT OR UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_sitter_info();

-- Initialize sitter_info for existing sitters
DO $$
DECLARE
  sitter record;
BEGIN
  FOR sitter IN
    SELECT id FROM profiles WHERE role = 'sitter'
  LOOP
    INSERT INTO sitter_info (sitter_id)
    VALUES (sitter.id)
    ON CONFLICT (sitter_id) DO NOTHING;
  END LOOP;
END;
$$;
