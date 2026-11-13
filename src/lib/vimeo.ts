import { type VideoRecord, supabase } from '@/lib/supabase';

const VIMEO_FUNCTION = 'fetch-vimeo';
const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;

type VimeoApiVideo = { id: string; title: string; url: string; thumbnail_url: string | null; orientation: 'landscape' | 'portrait'; width: number; height: number; created_at?: string };
export type VimeoVideo = VimeoApiVideo;

export async function fetchVimeoVideos(): Promise<VimeoVideo[]> {
  const { data, error } = await supabase.functions.invoke<{ videos?: VimeoVideo[]; error?: string }>(VIMEO_FUNCTION);
  if (error) { console.error('Vimeo fetch failed. Check the Cloudflare VITE_VIMEO_TOKEN environment variable and deployed fetch-vimeo function configuration.', error); return []; }
  if (data?.error) { console.error(`Vimeo fetch failed: ${data.error}. Check the Cloudflare VITE_VIMEO_TOKEN environment variable.`); return []; }
  return Array.isArray(data?.videos) ? data.videos : [];
}
export function vimeoToVideoRecord(video: VimeoVideo, index: number): VideoRecord {
  const id = video.id.replace(/^vimeo_/, '');
  return { id: `vimeo_${id}`, title: video.title, url: `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&muted=1&loop=1`, storage_path: `vimeo/${id}`, caption: video.title, category: CATEGORIES[index % CATEGORIES.length], orientation: video.orientation, user_id: null, likes: 0, views: 0, created_at: video.created_at || new Date().toISOString(), status: 'approved', thumbnail_url: video.thumbnail_url, vimeo_url: `https://vimeo.com/${encodeURIComponent(id)}` };
}
export function mergeVideos(dbVideos: VideoRecord[], vimeoVideos: VimeoVideo[]): VideoRecord[] {
  const records = vimeoVideos.map(vimeoToVideoRecord); const ids = new Set(dbVideos.map((v) => v.id)); const urls = new Set(dbVideos.map((v) => v.url));
  return [...records.filter((v) => !ids.has(v.id) && !urls.has(v.url)), ...dbVideos];
}
