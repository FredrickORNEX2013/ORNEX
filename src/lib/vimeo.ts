import { type VideoRecord, supabase } from '@/lib/supabase';

const VIMEO_FUNCTION = 'fetch-vimeo';
const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;

type VimeoApiVideo = {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  orientation: 'landscape' | 'portrait';
  width: number;
  height: number;
  created_at?: string;
};

export type VimeoVideo = VimeoApiVideo;

export async function fetchVimeoVideos(): Promise<VimeoVideo[]> {
  const { data, error } = await supabase.functions.invoke<{ videos?: VimeoVideo[] }>(VIMEO_FUNCTION);
  if (error) {
    console.error('Vimeo fetch failed', error);
    return [];
  }
  return Array.isArray(data?.videos) ? data.videos : [];
}

export function vimeoToVideoRecord(video: VimeoVideo, index: number): VideoRecord {
  const vimeoId = video.id.replace(/^vimeo_/, '');
  return {
    id: `vimeo_${vimeoId}`,
    title: video.title,
    url: `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?autoplay=1&muted=1&loop=1`,
    storage_path: `vimeo/${vimeoId}`,
    caption: video.title,
    category: CATEGORIES[index % CATEGORIES.length],
    orientation: video.orientation,
    user_id: null,
    likes: 0,
    views: 0,
    created_at: video.created_at || new Date().toISOString(),
    status: 'approved',
    thumbnail_url: video.thumbnail_url,
  };
}

export function mergeVideos(dbVideos: VideoRecord[], vimeoVideos: VimeoVideo[]): VideoRecord[] {
  const vimeoRecords = vimeoVideos.map(vimeoToVideoRecord);
  const dbIds = new Set(dbVideos.map((video) => video.id));
  const dbUrls = new Set(dbVideos.map((video) => video.url));
  const uniqueVimeo = vimeoRecords.filter((video) => !dbIds.has(video.id) && !dbUrls.has(video.url));
  return [...uniqueVimeo, ...dbVideos];
}
