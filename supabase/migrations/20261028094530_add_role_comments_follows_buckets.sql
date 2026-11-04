/*
# Add role to profiles, comments table, follows table, thumbnails+avatars buckets

1. Modified Tables
- profiles: add `role` column (text, default 'user')
- likes: deduplicate then add unique constraint on (video_id, user_id)

2. New Tables
- comments: id, video_id (FK videos), user_id, text, created_at
- follows: id, follower_id, following_id, created_at — unique on (follower_id, following_id)

3. Security
- RLS on comments + follows, anon+authenticated CRUD
- profiles: UPDATE grant for role setting

4. Storage
- "thumbnails" + "avatars" public buckets with policies
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Remove duplicate likes before adding unique constraint
DELETE FROM likes a USING likes b
WHERE a.id > b.id AND a.video_id = b.video_id AND a.user_id = b.user_id;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_video_user_unique') THEN
    ALTER TABLE likes ADD CONSTRAINT likes_video_user_unique UNIQUE (video_id, user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON comments TO anon, authenticated;

DROP POLICY IF EXISTS "read_comments" ON comments;
CREATE POLICY "read_comments" ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_comments" ON comments;
CREATE POLICY "insert_comments" ON comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_comments" ON comments;
CREATE POLICY "delete_comments" ON comments FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON follows TO anon, authenticated;

DROP POLICY IF EXISTS "read_follows" ON follows;
CREATE POLICY "read_follows" ON follows FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_follows" ON follows;
CREATE POLICY "insert_follows" ON follows FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_follows" ON follows;
CREATE POLICY "delete_follows" ON follows FOR DELETE
  TO anon, authenticated USING (true);

GRANT UPDATE ON profiles TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_thumbnails" ON storage.objects;
CREATE POLICY "public_read_thumbnails" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "public_insert_thumbnails" ON storage.objects;
CREATE POLICY "public_insert_thumbnails" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public_insert_avatars" ON storage.objects;
CREATE POLICY "public_insert_avatars" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'avatars');
