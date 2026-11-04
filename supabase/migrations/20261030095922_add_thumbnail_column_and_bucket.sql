-- Add thumbnail_url column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Generate thumbnails bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for thumbnails bucket
CREATE POLICY "public_read_thumbnails_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'thumbnails');

-- Public upload policy for thumbnails bucket  
CREATE POLICY "public_upload_thumbnails_bucket" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'thumbnails');
