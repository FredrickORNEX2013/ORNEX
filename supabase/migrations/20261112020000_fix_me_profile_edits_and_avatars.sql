-- Keep avatar objects publicly readable and scope avatar uploads to the signed-in user.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public_insert_avatars" ON storage.objects;
DROP POLICY IF EXISTS "anon_insert_avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_own_avatar" ON storage.objects;
CREATE POLICY "authenticated_insert_own_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_update_own_avatar" ON storage.objects;
CREATE POLICY "authenticated_update_own_avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_delete_own_avatar" ON storage.objects;
CREATE POLICY "authenticated_delete_own_avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Remove permissive/legacy profile UPDATE policies and let authenticated users edit their own row only.
DO $$
DECLARE
  update_policy record;
BEGIN
  FOR update_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', update_policy.policyname);
  END LOOP;
END $$;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
CREATE POLICY "authenticated_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
