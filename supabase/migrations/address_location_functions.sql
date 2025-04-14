-- Install the cube extension (required by earthdistance)
CREATE EXTENSION IF NOT EXISTS cube;

-- Install the earthdistance extension
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Ensure the location column exists as a point type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'location'
  ) THEN
    ALTER TABLE addresses ADD COLUMN location point;
  ELSIF (
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'location'
  ) = 'USER-DEFINED' THEN
    -- If the column exists but is of PostGIS type, drop it and recreate
    ALTER TABLE addresses DROP COLUMN location;
    ALTER TABLE addresses ADD COLUMN location point;
  END IF;
END
$$;

-- Create an index for faster distance queries
CREATE INDEX IF NOT EXISTS addresses_location_idx ON addresses USING gist (cube(earth_box(ll_to_earth(location[0], location[1]), 0)));

-- Update existing addresses to have a point location
UPDATE addresses
SET location = point(longitude, latitude)
WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL; 