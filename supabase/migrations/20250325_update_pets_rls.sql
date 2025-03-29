-- Drop the existing 'Users can view their own pets' policy
DROP POLICY IF EXISTS "Users can view their own pets" ON "public"."pets";

-- Create new policy that allows both pet owners AND sitters with a booking to view the pet
CREATE POLICY "Users can view pets they own or have bookings for" 
ON "public"."pets"
FOR SELECT
TO public
USING (
  -- Owner can view their own pets
  auth.uid() = owner_id
  OR
  -- Sitters can view pets they have bookings for
  EXISTS (
    SELECT 1 FROM walking_bookings 
    WHERE 
      -- Sitter is the current user
      walking_bookings.sitter_id = auth.uid() 
      -- Pet belongs to the pet owner
      AND walking_bookings.owner_id = pets.owner_id
      -- The booking contains this pet (using JSON array check)
      AND walking_bookings.selected_pets::jsonb @> to_jsonb(pets.id::text)::jsonb
  )
);
