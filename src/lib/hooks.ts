import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type AppProfile, type CommentRecord, type VideoRecord } from './supabase';
import { getCurrentUserId } from './user';
import { fetchVimeoVideos, mergeVideos } from './vimeo';

export type ProfileRecord = AppProfile & { avatar_color?: string | null; bio?: string | null; role?: string | null; is_channel?: boolean };
type ProfileListener = (profile: ProfileRecord) => void;
const profileListeners = new Set<ProfileListener>();
export function notifyProfileUpdated(profile: ProfileRecord) { profileListeners.forEach((listener) => listener(profile)); }
type VideosListener = (videos: VideoRecord[] | null) => void;
let videosCache: VideoRecord[] | null = null;
const videosListeners = new Set<VideosListener>();
async function fetchVideos(): Promise<VideoRecord[]> {
  const [{ data, error }, vimeoVideos] = await Promise.all([
    supabase.from('videos').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
    fetchVimeoVideos(),
  ]);
  if (error) throw error;
  return mergeVideos((data || []) as VideoRecord[], vimeoVideos);
}
export function publishVideo(video: VideoRecord) {
  if (videosCache === null) { videosListeners.forEach((listener) => listener(null)); return; }
  videosCache = [video, ...videosCache.filter((item) => item.id !== video.id)].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  videosListeners.forEach((listener) => listener(videosCache));
}
export function invalidateVideoCache() { videosCache = null; videosListeners.forEach((listener) => listener(null)); }
export function useVideos() {
  const [videos, setVideos] = useState<VideoRecord[]>(videosCache || []);
  const [loading, setLoading] = useState(videosCache === null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await fetchVideos(); videosCache = result; setVideos(result); setError(null); videosListeners.forEach((listener) => listener(result)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load videos.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const listener: VideosListener = (result) => { if (result === null) void load(); else { setVideos(result); setLoading(false); } }; videosListeners.add(listener); if (videosCache) { setVideos(videosCache); setLoading(false); } else void load(); return () => { videosListeners.delete(listener); }; }, [load]);
  return { videos, loading, error, refresh: load };
}
export function useProfiles(profileIds: string[] = []) {
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const idsKey = [...new Set(profileIds.filter(Boolean))].sort().join(',');
  useEffect(() => { const ids = idsKey ? idsKey.split(',') : []; if (!ids.length) { setProfiles({}); return; } let cancelled = false; void supabase.from('profiles').select('*').in('id', ids).then(({ data, error }) => { if (!cancelled && !error) setProfiles(Object.fromEntries((data || []).map((profile) => [profile.id, profile as ProfileRecord]))); }); const listener: ProfileListener = (profile) => { if (ids.includes(profile.id)) setProfiles((current) => ({ ...current, [profile.id]: profile })); }; profileListeners.add(listener); return () => { cancelled = true; profileListeners.delete(listener); }; }, [idsKey]);
  return profiles;
}
export function useProfile() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; void getCurrentUserId().then(async (userId) => { if (!userId) { if (!cancelled) setLoading(false); return; } const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle(); if (!cancelled) { if (!error) setProfile(data as ProfileRecord | null); setLoading(false); } }); return () => { cancelled = true; }; }, []);
  return { profile, setProfile, loading };
}
export function useComments(videoId: string) {
  const [comments, setComments] = useState<CommentRecord[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!videoId) { setComments([]); setLoading(false); return; } setLoading(true); const { data, error } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true }); if (error) { setLoading(false); return; } const rows = (data || []) as CommentRecord[]; const ids = [...new Set(rows.map((c) => c.user_id).filter(Boolean))]; let byUser: Record<string, ProfileRecord> = {}; if (ids.length) { const { data: profiles } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', ids); byUser = Object.fromEntries((profiles || []).map((p) => [p.id, p as ProfileRecord])); } setComments(rows.map((comment) => ({ ...comment, ...byUser[comment.user_id] }))); setLoading(false); }, [videoId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const listener: ProfileListener = (profile) => setComments((current) => current.map((comment) => comment.user_id === profile.id ? { ...comment, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url } : comment)); profileListeners.add(listener); return () => { profileListeners.delete(listener); }; }, []);
  const addComment = useCallback(async (text: string, userId: string) => { const value = text.trim(); if (!videoId || !userId || !value) return; const { error } = await supabase.from('comments').insert({ video_id: videoId, user_id: userId, text: value }); if (!error) await load(); }, [videoId, load]);
  return { comments, loading, addComment, refresh: load };
}
export function useLikeToggle(videoId: string, initialCount = 0, userId = '') {
  const [liked, setLiked] = useState(false); const [likeCount, setLikeCount] = useState(initialCount); const likedRef = useRef(false); const busyRef = useRef(false);
  useEffect(() => { let cancelled = false; likedRef.current = false; setLiked(false); setLikeCount(initialCount); if (!videoId) return () => { cancelled = true; }; void (async () => { const [countResult, likeResult] = await Promise.all([supabase.from('likes').select('id', { count: 'exact', head: true }).eq('video_id', videoId), userId ? supabase.from('likes').select('id').eq('video_id', videoId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })]); if (cancelled) return; if (!countResult.error && countResult.count !== null) setLikeCount(countResult.count); const isLiked = !!likeResult.data; likedRef.current = isLiked; setLiked(isLiked); })(); return () => { cancelled = true; }; }, [videoId, userId, initialCount]);
  const toggleLike = useCallback(async () => { if (!videoId || !userId || busyRef.current) return; busyRef.current = true; const wasLiked = likedRef.current; likedRef.current = !wasLiked; setLiked(!wasLiked); setLikeCount((count) => Math.max(0, count + (wasLiked ? -1 : 1))); const result = wasLiked ? await supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', userId) : await supabase.from('likes').insert({ video_id: videoId, user_id: userId }); if (result.error) { likedRef.current = wasLiked; setLiked(wasLiked); setLikeCount((count) => Math.max(0, count + (wasLiked ? 1 : -1))); } busyRef.current = false; }, [videoId, userId]);
  return { liked, likeCount, toggleLike };
}
