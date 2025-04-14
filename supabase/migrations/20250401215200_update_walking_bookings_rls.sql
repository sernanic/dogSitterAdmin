-- Update RLS policy for walking_bookings to allow sitters to update status

-- Drop the existing UPDATE policy (assuming the name from databaseInfo.md)
-- Note: Replace 'Users can update their own bookings' if your actual policy name differs.
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.walking_bookings;

-- Create a new UPDATE policy allowing either owner or sitter to update
CREATE POLICY "Owners or sitters can update bookings" 
ON public.walking_bookings 
FOR UPDATE 
USING (auth.uid() = owner_id OR auth.uid() = sitter_id) -- Allow update if user is owner OR sitter
WITH CHECK (auth.uid() = owner_id OR auth.uid() = sitter_id); -- Ensure update maintains this condition

-- Optional: Add comments to the policy for clarity
COMMENT ON POLICY "Owners or sitters can update bookings" ON public.walking_bookings 
IS 'Allows either the owner or the sitter associated with a booking to update it.';
