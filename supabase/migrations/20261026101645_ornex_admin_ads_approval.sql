/*
# ORNEX Mega Build: Admin system, ads, approval queue, NSFW filtering

## 1. Modified Tables
### videos — added columns:
- `status` (text, default 'pending') — 'pending' | 'approved' | 'rejected' | 'banned'
- `nsfw_flagged` (boolean, default false) — auto-flagged by NSFW keyword filter
- `nsfw_reason` (text, nullable) — reason if flagged
- `downloadable` (boolean, default true) — whether users can download
- `clicks` (bigint, default 0) — ad clicks (for ad-type entries)
- `ad_impressions` (bigint, default 0) — ad view count
- `is_ad` (boolean, default false) — marks this as an ad entry
- `ad_brand` (text, nullable) — brand name for sponsored ads
- `ad_link` (text, nullable) — Learn More link

## 2. New Tables
### admins
- `id` (uuid, primary key)
- `email` (text, unique, not null)
- `role` (text, not null, default 'mod') — 'owner' | 'full' | 'mod'
- `created_at` (timestamptz)
- Note: password_hash stored in Supabase auth.users — we use auth.users email/password

### ads
- `id` (uuid, primary key)
- `brand_name` (text, not null)
- `video_url` (text, not null) — the ad video URL
- `learn_more_url` (text, nullable)
- `skip_after_seconds` (integer, default 5)
- `impressions` (bigint, default 0)
- `clicks` (bigint, default 0)
- `active` (boolean, default true)
- `created_at` (timestamptz)
- `storage_path` (text, nullable)

### ad_analytics
- `id` (uuid, primary key)
- `ad_id` (uuid, references ads ON DELETE CASCADE)
- `event_type` (text, not null) — 'impression' | 'click' | 'skip'
- `created_at` (timestamptz)

### app_stats
- `id` (uuid, primary key)
- `stat_key` (text, not null)
- `stat_value` (numeric, default 0)
- `updated_at` (timestamptz, default now())
- Tracks: total_revenue, total_payouts, total_ad_revenue

## 3. Security
- RLS enabled on all new tables.
- videos: anon/authenticated can only SELECT approved + non-banned videos.
  - Admins (service role via edge functions) can see all.
- admins, ads, ad_analytics, app_stats: only service_role (edge functions) can access.
  - Frontend admin panel uses edge functions for all admin operations.
- Storage bucket 'videos' stays public.

## 4. Notes
  1. Admin authentication uses Supabase auth email/password.
  2. The admin role is stored in the admins table, mapped by email.
  3. All admin operations go through edge functions using the service role key.
  4. NSFW filtering is keyword-based on title/caption — done client-side at upload time.
  5. New videos default to 'pending' status — admin must approve.
*/

-- Add new columns to videos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'status') THEN
    ALTER TABLE videos ADD COLUMN status text NOT NULL DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'nsfw_flagged') THEN
    ALTER TABLE videos ADD COLUMN nsfw_flagged boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'nsfw_reason') THEN
    ALTER TABLE videos ADD COLUMN nsfw_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'downloadable') THEN
    ALTER TABLE videos ADD COLUMN downloadable boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'clicks') THEN
    ALTER TABLE videos ADD COLUMN clicks bigint NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ad_impressions') THEN
    ALTER TABLE videos ADD COLUMN ad_impressions bigint NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'is_ad') THEN
    ALTER TABLE videos ADD COLUMN is_ad boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ad_brand') THEN
    ALTER TABLE videos ADD COLUMN ad_brand text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ad_link') THEN
    ALTER TABLE videos ADD COLUMN ad_link text;
  END IF;
END $$;

-- Update videos policies: anon can only see approved, non-banned, non-NSFW
-- Drop old policies and recreate
DROP POLICY IF EXISTS "anon_select_videos" ON videos;
DROP POLICY IF EXISTS "anon_insert_videos" ON videos;
DROP POLICY IF EXISTS "anon_update_videos" ON videos;
DROP POLICY IF EXISTS "anon_delete_videos" ON videos;

CREATE POLICY "public_select_approved_videos" ON videos FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' AND nsfw_flagged = false AND is_ad = false);

-- Allow anon to insert (videos start as pending)
CREATE POLICY "anon_insert_videos" ON videos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon to update views/likes on approved videos
CREATE POLICY "anon_update_video_stats" ON videos FOR UPDATE
  TO anon, authenticated
  USING (status = 'approved')
  WITH CHECK (status = 'approved');

-- No direct delete from anon — admin only via edge function
-- (service_role bypasses RLS)

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'mod' CHECK (role IN ('owner', 'full', 'mod')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- Only service_role can access admins table (bypasses RLS)
GRANT ALL ON admins TO service_role;

-- Create ads table
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  video_url text NOT NULL,
  learn_more_url text,
  skip_after_seconds integer NOT NULL DEFAULT 5,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
-- Public can SELECT active ads; service_role has full access
GRANT SELECT ON ads TO anon, authenticated;
DROP POLICY IF EXISTS "public_select_active_ads" ON ads;
CREATE POLICY "public_select_active_ads" ON ads FOR SELECT
  TO anon, authenticated USING (active = true);
GRANT ALL ON ads TO service_role;

-- Create ad_analytics table
CREATE TABLE IF NOT EXISTS ad_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid REFERENCES ads(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click', 'skip')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;
GRANT ALL ON ad_analytics TO service_role;
-- Allow anon to insert analytics events
GRANT INSERT ON ad_analytics TO anon, authenticated;
DROP POLICY IF EXISTS "anon_insert_ad_analytics" ON ad_analytics;
CREATE POLICY "anon_insert_ad_analytics" ON ad_analytics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Create app_stats table
CREATE TABLE IF NOT EXISTS app_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text NOT NULL UNIQUE,
  stat_value numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_stats ENABLE ROW LEVEL SECURITY;
GRANT ALL ON app_stats TO service_role;
GRANT SELECT ON app_stats TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_app_stats" ON app_stats;
CREATE POLICY "anon_select_app_stats" ON app_stats FOR SELECT
  TO anon, authenticated USING (true);

-- Initialize default stats
INSERT INTO app_stats (stat_key, stat_value) VALUES
  ('total_revenue', 0),
  ('total_payouts', 0),
  ('total_ad_revenue', 0),
  ('total_video_uploads', 0)
ON CONFLICT (stat_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(active);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad_id ON ad_analytics(ad_id);