-- Add app_type column to profiles table to distinguish between user and sitter app tokens
ALTER TABLE profiles ADD COLUMN app_type TEXT DEFAULT 'sitter';

-- Update existing records to have the correct app_type based on role
UPDATE profiles SET app_type = CASE 
  WHEN role = 'sitter' THEN 'sitter'
  ELSE 'user'
END;

-- Add a comment to explain the purpose of app_type
COMMENT ON COLUMN profiles.app_type IS 'Identifies whether the push token is for the user or sitter app, to handle different Expo project IDs';
