/*
# Create videos table and public storage bucket

1. New Tables
- `videos`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `url` (text, not null) — public URL from Supabase storage getPublicUrl
  - `storage_path` (text, not null) — path within the 'videos' bucket for deletion
  - `created_at` (timestamptz, default now())
2. Storage
- Create a public storage bucket named 'videos' so files are accessible via getPublicUrl without signed URLs.
3. Security
- Enable RLS on `videos`.
- Grant CRUD to `anon` + `authenticated` (no-auth single-tenant app).
- Allow anon + authenticated full CRUD because data is intentionally public/shared.
- Storage policies: allow anon + authenticated to upload, read, and delete objects in the 'videos' bucket.
4. Notes
  1. This is a no-auth app — no user_id column, no auth.uid() checks.
  2. The public bucket means video URLs are accessible without signed URLs, preventing the "disappearing videos" issue caused by signed URL expiration.
*/

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_videos" ON videos;
CREATE POLICY "anon_select_videos" ON videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_videos" ON videos;
CREATE POLICY "anon_insert_videos" ON videos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_videos" ON videos;
CREATE POLICY "anon_update_videos" ON videos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_videos" ON videos;
CREATE POLICY "anon_delete_videos" ON videos FOR DELETE
  TO anon, authenticated USING (true);

-- Create the public 'videos' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: allow anon + authenticated to manage objects in the videos bucket
DROP POLICY IF EXISTS "anon_upload_videos_bucket" ON storage.objects;
CREATE POLICY "anon_upload_videos_bucket" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'videos');

DROP POLICY IF EXISTS "anon_read_videos_bucket" ON storage.objects;
CREATE POLICY "anon_read_videos_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "anon_delete_videos_bucket" ON storage.objects;
CREATE POLICY "anon_delete_videos_bucket" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'videos');