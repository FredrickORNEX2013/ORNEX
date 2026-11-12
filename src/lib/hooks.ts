export type ProfileRecord = {
  id: string; username: string; display_name: string;
  avatar_url?: string | null; avatar_color?: string | null;
  bio?: string | null;
  role?: string | null; created_at?: string;
};