import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
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
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  nsfw_flagged: boolean;
  nsfw_reason: string | null;
  downloadable: boolean;
  clicks: number;
  ad_impressions: number;
  is_ad: boolean;
  ad_brand: string | null;
  ad_link: string | null;
  thumbnail_url: string | null;
  is_published?: boolean;
  video_url?: string | null;
  [key: string]: unknown;
};

export type ProfileRecord = {
  id: string;
  username: string;
  display_name: string;
  surname: string | null;
  avatar_color: string;
  followers: number;
  following: number;
  created_at: string;
  role?: string;
};

export type CommentRecord = {
  id: string;
  video_id: string;
  user_id: string | null;
  text: string;
  created_at: string;
};

export const CATEGORIES = ['All', 'Comedy', 'Entertainment', 'Live', 'Drama'] as const;
export type Category = (typeof CATEGORIES)[number];
