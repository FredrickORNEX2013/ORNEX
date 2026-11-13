-- Guest-ready video rows and public anonymous access for the ORNEX browser guest identity.
-- guest_id is a client-generated UUID; it is an identifier, not authentication or proof of ownership.
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS guest_id uuid;
CREATE INDEX IF NOT EXISTS videos_guest_created_idx ON public.videos (guest_id, created_at DESC);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO anon, authenticated;
DROP POLICY IF EXISTS ornex_guest_videos_read ON public.videos;
CREATE POLICY ornex_guest_videos_read ON public.videos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS ornex_guest_videos_insert ON public.videos;
CREATE POLICY ornex_guest_videos_insert ON public.videos FOR INSERT TO anon, authenticated WITH CHECK (guest_id IS NOT NULL);
DROP POLICY IF EXISTS ornex_guest_videos_update ON public.videos;
CREATE POLICY ornex_guest_videos_update ON public.videos FOR UPDATE TO anon, authenticated USING (guest_id IS NOT NULL) WITH CHECK (guest_id IS NOT NULL);

-- Anonymous guest interactions use the same persistent UUID in the existing social tables.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles','likes','comments','follows','social_notifications','saved_videos','video_shares'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', table_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

-- Make the public video bucket writable by guests. Ensure the storage bucket exists first.
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS ornex_guest_video_upload ON storage.objects;
CREATE POLICY ornex_guest_video_upload ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'videos');
DROP POLICY IF EXISTS ornex_guest_video_read ON storage.objects;
CREATE POLICY ornex_guest_video_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'videos');
