-- Notifications are unread until the authenticated recipient opens their Activities inbox.
ALTER TABLE public.social_notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
CREATE INDEX IF NOT EXISTS social_notifications_unread_idx ON public.social_notifications (recipient_id) WHERE read_at IS NULL;

-- Keep a profile row available as soon as an auth user is created (including email/password signup).
CREATE OR REPLACE FUNCTION public.create_profile_for_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name text;
  safe_name text;
BEGIN
  base_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(COALESCE(NEW.email, 'user'), '@', 1), 'user');
  safe_name := lower(regexp_replace(base_name, '[^a-zA-Z0-9._]', '', 'g'));
  safe_name := left(COALESCE(NULLIF(safe_name, ''), 'user'), 18) || '_' || left(replace(NEW.id::text, '-', ''), 6);
  INSERT INTO public.profiles (id, username, display_name, bio, avatar_url)
  VALUES (
    NEW.id,
    safe_name,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    '',
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_auth_user();
