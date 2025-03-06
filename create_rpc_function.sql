-- Create a stored procedure to insert profiles that bypasses RLS
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT DEFAULT 'sitter',
  user_avatar_url TEXT DEFAULT NULL,
  user_bio TEXT DEFAULT NULL,
  user_location TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function creator
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert into profiles table
  INSERT INTO profiles (id, name, email, role, avatar_url, bio, location)
  VALUES (
    user_id,
    user_name,
    user_email,
    user_role::text,
    user_avatar_url,
    user_bio,
    user_location
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = user_name,
    email = user_email,
    role = user_role::text,
    avatar_url = COALESCE(user_avatar_url, profiles.avatar_url),
    bio = COALESCE(user_bio, profiles.bio),
    location = COALESCE(user_location, profiles.location),
    updated_at = now()
  RETURNING to_jsonb(profiles.*) INTO result;
  
  RETURN result;
END;
$$; 