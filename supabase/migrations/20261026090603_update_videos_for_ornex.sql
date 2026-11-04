/*
# Update videos table for ORNEX social app and add profiles + likes tables

1. Modified Tables
- `videos` — added columns to support social features:
  - `caption` (text, nullable) — user-written caption for the post
  - `category` (text, nullable) — content category (Comedy, Entertainment, Live, Drama, All)
  - `orientation` (text, not null, default 'landscape') — 'landscape' (16:9) or 'portrait' (9:16)
  - `user_id` (uuid, nullable) — pseudo user ID for the demo (no auth)
  - `likes` (integer, not null, default 0) — like counter
  - `views` (bigint, not null, default 0) — view counter
  - Kept existing `title`, `url`, `storage_path`, `created_at`.
2. New Tables
- `profiles`
  - `id` (uuid, primary key)
  - `username` (text, not null, unique)
  - `display_name` (text, not null)
  - `avatar_color` (text, default) — color for avatar circle
  - `followers` (integer, default 0)
  - `following` (integer, default 0)
  - `created_at` (timestamptz)
- `likes` — tracks individual likes to prevent double-likes
  - `id` (uuid, primary key)
  - `video_id` (uuid, references videos)
  - `user_id` (uuid, nullable)
  - `created_at` (timestamptz)
3. Security
- RLS enabled on all new tables.
- All tables grant CRUD to anon + authenticated (no-auth demo app).
- Storage bucket 'videos' already public from prior migration.
4. Notes
  1. No auth — user_id is a pseudo ID stored in localStorage for the demo.
  2. All data is intentionally public/shared (single-tenant pattern).
  3. Non-destructive: only ADD columns, never drop or alter existing column types.
*/

-- Add new columns to videos (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'caption') THEN
    ALTER TABLE videos ADD COLUMN caption text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'category') THEN
    ALTER TABLE videos ADD COLUMN category text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'orientation') THEN
    ALTER TABLE videos ADD COLUMN orientation text NOT NULL DEFAULT 'landscape';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'user_id') THEN
    ALTER TABLE videos ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'likes') THEN
    ALTER TABLE videos ADD COLUMN likes integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'views') THEN
    ALTER TABLE videos ADD COLUMN views bigint NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#f97316',
  followers integer NOT NULL DEFAULT 0,
  following integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON likes TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_likes" ON likes;
CREATE POLICY "anon_select_likes" ON likes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_likes" ON likes;
CREATE POLICY "anon_insert_likes" ON likes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_likes" ON likes;
CREATE POLICY "anon_delete_likes" ON likes FOR DELETE
  TO anon, authenticated USING (true);

-- Ensure storage bucket is still public
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;