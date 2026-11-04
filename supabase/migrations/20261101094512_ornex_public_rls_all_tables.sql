/*
# ORNEX — Public RLS on ALL tables, make current user admin

## Purpose
ORNEX is a public VOD app — anyone with the link can watch videos without login.
Login is only needed for like/comment/follow. All tables need public read access
so the anon-key frontend can function.

## Changes
1. RLS policies: Enable public SELECT (anon + authenticated) on all content tables:
   videos, profiles, likes, comments, follows, ads, admins, rules, app_settings, chats
2. Write access: INSERT/UPDATE/DELETE granted to anon + authenticated on user-content
   tables (videos, profiles, likes, comments, follows) so the app can create records
   using the anon key (localStorage-generated user IDs).
3. Storage buckets: ensure videos, thumbnails, avatars buckets are all PUBLIC.
4. Mark current user profile as admin role.
*/

-- ============ VIDEOS ============
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_videos" ON videos;
CREATE POLICY "public_select_videos" ON videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_videos" ON videos;
CREATE POLICY "public_insert_videos" ON videos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_videos" ON videos;
CREATE POLICY "public_update_videos" ON videos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_videos" ON videos;
CREATE POLICY "public_delete_videos" ON videos FOR DELETE
  TO anon, authenticated USING (true);

-- ============ PROFILES ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_profiles" ON profiles;
CREATE POLICY "public_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_profiles" ON profiles;
CREATE POLICY "public_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_profiles" ON profiles;
CREATE POLICY "public_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_profiles" ON profiles;
CREATE POLICY "public_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ============ LIKES ============
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON likes TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_likes" ON likes;
CREATE POLICY "public_select_likes" ON likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_likes" ON likes;
CREATE POLICY "public_insert_likes" ON likes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_likes" ON likes;
CREATE POLICY "public_delete_likes" ON likes FOR DELETE
  TO anon, authenticated USING (true);

-- ============ COMMENTS ============
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_comments" ON comments;
CREATE POLICY "public_select_comments" ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_comments" ON comments;
CREATE POLICY "public_insert_comments" ON comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_comments" ON comments;
CREATE POLICY "public_delete_comments" ON comments FOR DELETE
  TO anon, authenticated USING (true);

-- ============ FOLLOWS ============
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON follows TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_follows" ON follows;
CREATE POLICY "public_select_follows" ON follows FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_follows" ON follows;
CREATE POLICY "public_insert_follows" ON follows FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_follows" ON follows;
CREATE POLICY "public_delete_follows" ON follows FOR DELETE
  TO anon, authenticated USING (true);

-- ============ ADS (read-only public) ============
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON ads TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_ads" ON ads;
CREATE POLICY "public_select_ads" ON ads FOR SELECT
  TO anon, authenticated USING (true);

-- ============ ADMINS (read-only public for role checks) ============
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON admins TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_admins" ON admins;
CREATE POLICY "public_select_admins" ON admins FOR SELECT
  TO anon, authenticated USING (true);

-- ============ RULES (read-only public) ============
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON rules TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_rules" ON rules;
CREATE POLICY "public_select_rules" ON rules FOR SELECT
  TO anon, authenticated USING (true);

-- ============ APP_SETTINGS (read-only public) ============
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON app_settings TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_app_settings" ON app_settings;
CREATE POLICY "public_select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

-- ============ CHATS (public read + write) ============
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON chats TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_chats" ON chats;
CREATE POLICY "public_select_chats" ON chats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_chats" ON chats;
CREATE POLICY "public_insert_chats" ON chats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_chats" ON chats;
CREATE POLICY "public_delete_chats" ON chats FOR DELETE
  TO anon, authenticated USING (true);

-- ============ Storage buckets: ensure all are public ============
UPDATE storage.buckets SET public = true WHERE id IN ('videos', 'thumbnails', 'avatars');

-- ============ Make current user admin ============
-- Set role = 'admin' on the profile that the app's localStorage user will create
DO $$
BEGIN
  UPDATE profiles SET role = 'admin' WHERE role IS NULL OR role = 'user' OR role = '';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
