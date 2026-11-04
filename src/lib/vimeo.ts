import { type VideoRecord } from '@/lib/supabase';

export const VIMEO_TOKEN = '75c04bad79903d8d1e710128fbfb171f';

const VIMEO_LIST_URL = 'https://api.vimeo.com/me/videos?per_page=50';
const VIMEO_TIMEOUT_MS = 10000;

type VimeoFile = {
  link?: string;
  type?: string;
  width?: number;
  height?: number;
};

type VimeoPictureSize = {
  link?: string;
  width?: number;
  height?: number;
};

type VimeoApiVideo = {
  uri: string;
  name?: string;
  width?: number;
  height?: number;
  pictures?: { sizes?: VimeoPictureSize[] };
  files?: VimeoFile[];
};

export type VimeoVideo = {
  id: string;
  title: string;
  videoUrl: string;
  thumb: string;
  orientation: 'landscape' | 'portrait';
  width: number;
  height: number;
};

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;

function pickBestFile(files: VimeoFile[]): VimeoFile | undefined {
  const playable = files.filter((f) => !!f.link);
  const mp4 = playable.filter((f) => f.type === 'video/mp4');
  const pool = mp4.length > 0 ? mp4 : playable;
  return [...pool].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
}

function toVimeoVideo(item: VimeoApiVideo): VimeoVideo | null {
  const file = pickBestFile(item.files ?? []);
  if (!file?.link) return null;

  const sizes = item.pictures?.sizes ?? [];
  const thumb = sizes[sizes.length - 1]?.link ?? '';
  const width = item.width ?? file.width ?? 0;
  const height = item.height ?? file.height ?? 0;

  return {
    id: item.uri.split('/').pop() ?? item.uri,
    title: item.name ?? '',
    videoUrl: file.link,
    thumb,
    orientation: height > width ? 'portrait' : 'landscape',
    width,
    height,
  };
}

export async function fetchVimeoVideos(): Promise<VimeoVideo[]> {
  try {
    const res = await fetch(VIMEO_LIST_URL, {
      headers: { Authorization: `Bearer ${VIMEO_TOKEN}` },
      signal: AbortSignal.timeout(VIMEO_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Vimeo responded ${res.status}`);
    const json = (await res.json()) as { data?: VimeoApiVideo[] };
    return (json.data ?? [])
      .map(toVimeoVideo)
      .filter((v): v is VimeoVideo => v !== null);
  } catch (err) {
    console.error('Vimeo fetch failed', err);
    return [];
  }
}

export function vimeoToVideoRecord(v: VimeoVideo, index: number): VideoRecord {
  return {
    id: v.id,
    title: v.title,
    url: v.videoUrl,
    storage_path: `vimeo/${v.id}`,
    caption: v.title,
    category: CATEGORIES[index % CATEGORIES.length],
    orientation: v.orientation,
    user_id: null,
    likes: Math.floor(Math.random() * 5000) + 100,
    views: Math.floor(Math.random() * 50000) + 1000,
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
    status: 'approved',
    nsfw_flagged: false,
    nsfw_reason: null,
    downloadable: false,
    clicks: 0,
    ad_impressions: 0,
    is_ad: false,
    ad_brand: null,
    ad_link: null,
    thumbnail_url: v.thumb || null,
  };
}

export function mergeVideos(dbVideos: VideoRecord[], vimeoVideos: VimeoVideo[]): VideoRecord[] {
  const vimeoRecords = vimeoVideos.map((v, i) => vimeoToVideoRecord(v, i));
  const dbUrls = new Set(dbVideos.map((v) => v.url));
  const uniqueVimeo = vimeoRecords.filter((v) => !dbUrls.has(v.url));
  return [...uniqueVimeo, ...dbVideos];
}
