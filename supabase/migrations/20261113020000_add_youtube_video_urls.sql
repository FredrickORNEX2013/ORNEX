-- Persist supported external YouTube URLs alongside uploaded video URLs.
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS youtube_url text;
