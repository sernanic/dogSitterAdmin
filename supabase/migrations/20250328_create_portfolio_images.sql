-- Create a new storage bucket for sitter portfolio images with public read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Clean up existing policies if they exist
DROP POLICY IF EXISTS "Public Access for Portfolio Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own portfolio images" ON storage.objects;

-- Allow public access to read files (anyone can view portfolio images)
CREATE POLICY "Public Access for Portfolio Images" ON storage.objects
FOR SELECT
USING (bucket_id = 'portfolio');

-- Allow authenticated users to upload portfolio images
CREATE POLICY "Authenticated Users can upload portfolio images" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'portfolio');

-- Allow users to update/replace their portfolio images
CREATE POLICY "Users can update their portfolio images" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'portfolio')
WITH CHECK (bucket_id = 'portfolio');

-- Allow users to delete their portfolio images
CREATE POLICY "Users can delete their portfolio images" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'portfolio');

-- Create a table to store sitter portfolio images
CREATE TABLE IF NOT EXISTS portfolio_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create an index for faster lookups by sitter_id
CREATE INDEX IF NOT EXISTS portfolio_images_sitter_id_idx ON portfolio_images(sitter_id);

-- Enable Row Level Security on portfolio_images table
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

-- Create a policy for users to see their own portfolio images
CREATE POLICY "Users can view their own portfolio images"
  ON portfolio_images
  FOR SELECT
  USING (
    auth.uid() = sitter_id
  );

-- Create a policy for users to insert their own portfolio images
CREATE POLICY "Users can insert their own portfolio images"
  ON portfolio_images
  FOR INSERT
  WITH CHECK (
    auth.uid() = sitter_id
  );

-- Create a policy for users to update their own portfolio images
CREATE POLICY "Users can update their own portfolio images"
  ON portfolio_images
  FOR UPDATE
  USING (
    auth.uid() = sitter_id
  )
  WITH CHECK (
    auth.uid() = sitter_id
  );

-- Create a policy for users to delete their own portfolio images
CREATE POLICY "Users can delete their own portfolio images"
  ON portfolio_images
  FOR DELETE
  USING (
    auth.uid() = sitter_id
  );

-- Create a trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_portfolio_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before update
CREATE TRIGGER portfolio_images_updated_at
BEFORE UPDATE ON portfolio_images
FOR EACH ROW
EXECUTE FUNCTION update_portfolio_images_updated_at();

-- Create a policy for public viewing of portfolio images
CREATE POLICY "Public can view all portfolio images"
  ON portfolio_images
  FOR SELECT
  USING (true);
