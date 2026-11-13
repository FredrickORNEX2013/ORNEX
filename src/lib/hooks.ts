import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type AppProfile, type CommentRecord, type VideoRecord } from './supabase';
import { getGuestProfile } from './user';

const FREE_MP4S = [
  'BigBuckBunny','ElephantsDream','ForBiggerBlazes','ForBiggerEscapes','ForBiggerFun','ForBiggerJoyrides','ForBiggerMeltdowns','ForBiggerMobiles','Sintel','TearsOfSteel',
  'SubaruOutbackOnStreetAndDirt','VolkswagenGTIReview','WeAreGoingOnBullrun','WhatCarCanYouGetForAGrand','ForBiggerBlazes','ElephantsDream','Sintel','BigBuckBunny','ForBiggerFun','TearsOfSteel',
];
const FALLBACK_VIDEOS: VideoRecord[] = FREE_MP4S.map((name, index) => ({
  id: `sample-${index + 1}`, title: `${['Comedy','Drama','Entertainment','Live'][index % 4]} sample ${index + 1}`,
  url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`, storage_path: `sample/${name}.mp4`,
  caption: 'Free sample video', category: ['Comedy','Drama','Entertainment','Live'][index % 4], orientation: 'landscape', user_id: null,
  likes: 0, views: 0, created_at: new Date(Date.now() - index * 1000).toISOString(), status: 'approved', type: 'SHORT', duration_seconds: 30,
}));
let cache: VideoRecord[] | null = null;
type Listener = (rows: VideoRecord[] | null) => void;
const listeners = new Set<Listener>();
const pexelsKey = import.meta.env.VITE_PEXELS_API_KEY;

async function fetchPexels(): Promise<VideoRecord[]> {
  if (!pexelsKey) return [];
  try {
    const response = await fetch('https://api.pexels.com/videos/search?query=vertical%20short%20video&per_page=20&orientation=portrait', { headers: { Authorization: pexelsKey } });
    if (!response.ok) return [];
    const body = await response.json() as { videos?: Array<{ id: number; url: string; duration: number; image: string; width: number; height: number; video_files?: Array<{ link: string; quality?: string; file_type?: string }> }> };
    return (body.videos || []).flatMap((video, index) => {
      const file = (video.video_files || []).find((item) => item.file_type === 'video/mp4' && item.quality === 'hd') || (video.video_files || []).find((item) => item.file_type === 'video/mp4');
      if (!file) return [];
      return [{ id: `pexels-${video.id}`, title: `Pexels video ${video.id}`, url: file.link, storage_path: `pexels/${video.id}`, caption: 'Pexels free video', category: ['Comedy','Drama','Entertainment','Live'][index % 4], orientation: video.height > video.width ? 'portrait' as const : 'landscape' as const, user_id: null, likes: 0, views: 0, created_at: new Date(Date.now() - index * 1000).toISOString(), status: 'approved' as const, type: 'SHORT', duration_seconds: video.duration, thumbnail_url: video.image }];
    });
  } catch { return []; }
}
async function fetchVideos(): Promise<VideoRecord[]> {
  const [pexels, dbResult] = await Promise.all([
    fetchPexels(),
    supabase.from('videos').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(100),
  ]);
  const dbRows = dbResult.error ? [] : (dbResult.data || []) as VideoRecord[];
  const guestRows = dbRows.filter((row) => row.guest_id || row.user_id);
  const merged = [...guestRows, ...pexels, ...FALLBACK_VIDEOS];
  const seen = new Set<string>();
  return merged.filter((row) => { if (seen.has(row.id)) return false; seen.add(row.id); return true; });
}
export function publishVideo(video: VideoRecord) { cache = [video, ...(cache || []).filter((item) => item.id !== video.id)]; listeners.forEach((listener) => listener(cache)); }
export function invalidateVideoCache() { cache = null; listeners.forEach((listener) => listener(null)); }
export function useVideos() {
  const [videos, setVideos] = useState<VideoRecord[]>(cache || FALLBACK_VIDEOS);
  const [loading, setLoading] = useState(cache === null);
  const load = useCallback(async () => { setLoading(true); try { const rows = await fetchVideos(); cache = rows.length ? rows : FALLBACK_VIDEOS; setVideos(cache); listeners.forEach((listener) => listener(cache)); } catch { cache = FALLBACK_VIDEOS; setVideos(cache); } finally { setLoading(false); } }, []);
  useEffect(() => { const listener: Listener = (rows) => { if (rows) { setVideos(rows); setLoading(false); } else void load(); }; listeners.add(listener); if (cache === null) void load(); return () => { listeners.delete(listener); }; }, [load]);
  return { videos, loading, error: null as string | null, refresh: load };
}
export function useProfiles(ids: string[] = []) {
  const [profiles, setProfiles] = useState<Record<string, AppProfile>>({});
  const key = [...new Set(ids.filter(Boolean))].sort().join(',');
  useEffect(() => { const values = key ? key.split(',') : []; if (!values.length) { setProfiles({}); return; } let done = false; void supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', values).then(({ data }) => { if (!done) setProfiles(Object.fromEntries((data || []).map((p) => [p.id, p as AppProfile]))); }); return () => { done = true; }; }, [key]);
  return profiles;
}
export function useComments(videoId: string) {
  const [comments, setComments] = useState<CommentRecord[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const { data } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true }); setComments((data || []) as CommentRecord[]); setLoading(false); }, [videoId]);
  useEffect(() => { void load(); }, [load]);
  const addComment = useCallback(async (text: string, userId: string) => { const row = { video_id: videoId, user_id: userId, text: text.trim(), created_at: new Date().toISOString() }; const { data, error } = await supabase.from('comments').insert(row).select('*').single(); if (!error && data) setComments((previous) => [...previous, data as CommentRecord]); }, [videoId]);
  return { comments, loading, addComment, refresh: load };
}
export function useLikeToggle(videoId: string, initialCount = 0, userId = '') {
  const [liked, setLiked] = useState(false); const [likeCount, setLikeCount] = useState(initialCount); const busy = useRef(false);
  useEffect(() => { let cancelled = false; setLikeCount(initialCount); if (!userId || !videoId) return; void Promise.all([supabase.from('likes').select('id', { count: 'exact', head: true }).eq('video_id', videoId), supabase.from('likes').select('id').eq('video_id', videoId).eq('user_id', userId).maybeSingle()]).then(([count, own]) => { if (!cancelled) { setLikeCount(count.count ?? initialCount); setLiked(!!own.data); } }); return () => { cancelled = true; }; }, [videoId, userId, initialCount]);
  const toggleLike = useCallback(async () => { if (!videoId || !userId || busy.current) return; busy.current = true; const next = !liked; setLiked(next); setLikeCount((count) => Math.max(0, count + (next ? 1 : -1))); const result = next ? await supabase.from('likes').insert({ video_id: videoId, user_id: userId }) : await supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', userId); if (result.error) { setLiked(!next); setLikeCount((count) => Math.max(0, count + (next ? -1 : 1))); } busy.current = false; }, [videoId, userId, liked]);
  return { liked, likeCount, toggleLike };
}
export function currentGuest() { return getGuestProfile(); }
