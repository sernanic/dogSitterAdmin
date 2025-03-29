-- Add stripe_account_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL;

-- Add comment to column
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect account ID for sitters';

-- Create index on stripe_account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id);
