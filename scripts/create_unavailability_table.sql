-- Enable the uuid-ossp extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if table already exists and drop if needed
DROP TABLE IF EXISTS sitter_unavailability;

-- Create sitter_unavailability table for date-specific unavailability
CREATE TABLE sitter_unavailability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES profiles(id),
    unavailable_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (sitter_id, unavailable_date) -- Prevents duplicate overrides
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sitter_unavailability_sitter_date 
ON sitter_unavailability (sitter_id, unavailable_date);

-- Insert some test data (optional)
-- INSERT INTO sitter_unavailability (sitter_id, unavailable_date)
-- VALUES 
--   ('your-sitter-uuid', '2023-05-01'),
--   ('your-sitter-uuid', '2023-05-15'),
--   ('your-sitter-uuid', '2023-05-30');

-- Function to add an unavailable date for a sitter
CREATE OR REPLACE FUNCTION insert_sitter_unavailability(
    p_sitter_id UUID,
    p_unavailable_date DATE
) RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO sitter_unavailability (sitter_id, unavailable_date)
    VALUES (p_sitter_id, p_unavailable_date)
    RETURNING id INTO new_id;
    RETURN new_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Sitter % is already marked unavailable on %', p_sitter_id, p_unavailable_date;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a sitter is available on a specific date
CREATE OR REPLACE FUNCTION check_sitter_availability_for_date(
    p_sitter_id UUID,
    p_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the sitter is unavailable on this date
    IF EXISTS (
        SELECT 1 
        FROM sitter_unavailability 
        WHERE sitter_id = p_sitter_id 
        AND unavailable_date = p_date
    ) THEN
        RETURN FALSE; -- Sitter is unavailable
    END IF;

    -- Sitter is available
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to delete an unavailability date
CREATE OR REPLACE FUNCTION delete_sitter_unavailability(
    p_sitter_id UUID,
    p_unavailable_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    DELETE FROM sitter_unavailability
    WHERE sitter_id = p_sitter_id
    AND unavailable_date = p_unavailable_date;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql; 