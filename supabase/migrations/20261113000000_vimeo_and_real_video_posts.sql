-- Vimeo playback metadata plus targeted cleanup of the known ORNEX demo seed rows.
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS vimeo_url text;

-- Remove only records created by the removed seeder; leave real user content untouched.
DELETE FROM public.videos
WHERE storage_path LIKE 'demo-seed/ornex-v1/%'
   OR user_id IN (SELECT id FROM public.profiles WHERE username = 'ornex_demo');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_insert_own_videos" ON public.videos;
CREATE POLICY "authenticated_insert_own_videos" ON public.videos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
