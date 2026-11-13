-- Persistent saves/shares and an inbox fed exclusively by real social actions.
CREATE TABLE IF NOT EXISTS public.saved_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_videos_user_video_unique UNIQUE (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS public.video_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('like', 'comment', 'follow', 'share')),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.saved_videos TO authenticated;
GRANT SELECT, INSERT ON public.video_shares TO authenticated;
GRANT SELECT ON public.social_notifications TO authenticated;

DROP POLICY IF EXISTS "read_saved_videos" ON public.saved_videos;
CREATE POLICY "read_saved_videos" ON public.saved_videos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_saved_videos" ON public.saved_videos;
CREATE POLICY "insert_saved_videos" ON public.saved_videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_saved_videos" ON public.saved_videos;
CREATE POLICY "delete_saved_videos" ON public.saved_videos FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_video_shares" ON public.video_shares;
CREATE POLICY "insert_video_shares" ON public.video_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_own_video_shares" ON public.video_shares;
CREATE POLICY "read_own_video_shares" ON public.video_shares FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "read_own_social_notifications" ON public.social_notifications;
CREATE POLICY "read_own_social_notifications" ON public.social_notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS social_notifications_recipient_created_idx ON public.social_notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS video_shares_user_video_idx ON public.video_shares (user_id, video_id);

CREATE OR REPLACE FUNCTION public.notify_video_owner_of_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  actor uuid;
  target_video uuid;
  action_kind text;
BEGIN
  IF TG_TABLE_NAME = 'follows' THEN
    owner_id := NEW.following_id;
    actor := NEW.follower_id;
    target_video := NULL;
    action_kind := 'follow';
  ELSE
    owner_id := NULL;
    actor := NEW.user_id;
    target_video := NEW.video_id;
    action_kind := CASE TG_TABLE_NAME WHEN 'likes' THEN 'like' WHEN 'comments' THEN 'comment' ELSE 'share' END;
    SELECT user_id INTO owner_id FROM public.videos WHERE id = target_video;
  END IF;

  IF owner_id IS NOT NULL AND actor IS NOT NULL AND owner_id <> actor THEN
    INSERT INTO public.social_notifications (recipient_id, actor_id, kind, video_id)
    VALUES (owner_id, actor, action_kind, target_video);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_video_owner_on_like ON public.likes;
CREATE TRIGGER notify_video_owner_on_like AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.notify_video_owner_of_action();
DROP TRIGGER IF EXISTS notify_video_owner_on_comment ON public.comments;
CREATE TRIGGER notify_video_owner_on_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_video_owner_of_action();
DROP TRIGGER IF EXISTS notify_user_on_follow ON public.follows;
CREATE TRIGGER notify_user_on_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_video_owner_of_action();
DROP TRIGGER IF EXISTS notify_video_owner_on_share ON public.video_shares;
CREATE TRIGGER notify_video_owner_on_share AFTER INSERT ON public.video_shares FOR EACH ROW EXECUTE FUNCTION public.notify_video_owner_of_action();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
