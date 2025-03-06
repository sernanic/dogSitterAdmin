-- Create a new storage bucket for avatars with public read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Clean up existing policies if they exist (optional - helps if running multiple times)
DROP POLICY IF EXISTS "Public Access for Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Allow public access to read files (anyone can view avatars)
CREATE POLICY "Public Access for Avatars" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatar files
CREATE POLICY "Authenticated Users can upload avatars" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow users to update/replace any avatar
CREATE POLICY "Users can update avatars" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow users to delete avatars
CREATE POLICY "Users can delete avatars" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
