import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export type VideoRecord = {
  id: string;
  title: string | null;
  url: string;
  storage_path: string;
  caption: string | null;
  category: string | null;
  orientation: 'landscape' | 'portrait';
  user_id: string | null;
  likes: number;
  views: number;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  type?: 'SHORT' | 'LONG' | string | null;
  duration_seconds?: number | null;
  is_live?: boolean;
  is_channel?: boolean;
  thumbnail_url?: string | null;
  vimeo_url?: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type AppProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
};

export type CommentRecord = {
  id: string;
  video_id: string;
  user_id: string;
  text: string;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};
