-- Create the boarding_availability table
CREATE TABLE IF NOT EXISTS public.boarding_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Enforce uniqueness of sitter_id + date
    CONSTRAINT boarding_availability_sitter_date_unique UNIQUE (sitter_id, available_date)
);

-- Add RLS policies
ALTER TABLE public.boarding_availability ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow users to select their own data
CREATE POLICY boarding_availability_select_policy
    ON public.boarding_availability
    FOR SELECT
    USING (auth.uid() = sitter_id);

-- Create a policy to allow users to insert their own data
CREATE POLICY boarding_availability_insert_policy
    ON public.boarding_availability
    FOR INSERT
    WITH CHECK (auth.uid() = sitter_id);

-- Create a policy to allow users to update their own data
CREATE POLICY boarding_availability_update_policy
    ON public.boarding_availability
    FOR UPDATE
    USING (auth.uid() = sitter_id);

-- Create a policy to allow users to delete their own data
CREATE POLICY boarding_availability_delete_policy
    ON public.boarding_availability
    FOR DELETE
    USING (auth.uid() = sitter_id);

-- Create an index on sitter_id for faster queries
CREATE INDEX IF NOT EXISTS boarding_availability_sitter_id_idx ON public.boarding_availability(sitter_id);

-- Create an index on available_date for date range queries
CREATE INDEX IF NOT EXISTS boarding_availability_date_idx ON public.boarding_availability(available_date);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_boarding_availability_updated_at ON public.boarding_availability;
CREATE TRIGGER update_boarding_availability_updated_at
BEFORE UPDATE ON public.boarding_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
