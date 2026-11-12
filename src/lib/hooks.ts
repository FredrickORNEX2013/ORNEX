import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type VideoRecord, type CommentRecord } from './supabase';
import { getCurrentAuthUser, getOrCreateCurrentProfile } from './user';
import { fetchVimeoVideos, mergeVideos } from './vimeo';
import { loadWatchState, saveWatchState, saveClaimedRewards, type WatchState } from './watchtime';

export type ProfileRecord = {
  id: string; username: string; display_name: string;
  avatar_url?: string | null; avatar_color?: string | null;
  role?: string | null; created_at?: string;
};
export type AdRecord = { id: string; active: boolean; created_at?: string; [key: string]: any };

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function normalizeVideo(v: Record<string, unknown>): VideoRecord {
  const url = (v.url as string) || (v.video_url as string) || '';
  return {
    id: (v.id as string) || crypto.randomUUID(),
    title: (v.title as string) || null, url,
    storage_path: (v.storage_path as string) || url,
    caption: (v.caption as string) || null,
    category: (v.category as string) || null,
    orientation: (v.orientation as 'landscape' | 'portrait') || 'landscape',
    user_id: (v.user_id as string) || null,
    likes: (v.likes as number) || 0, views: (v.views as number) || 0,
    created_at: (v.created_at as string) || new Date().toISOString(),
    status: (v.status as any) || 'approved',
    username: (v.username as string) || null,
    display_name: (v.display_name as string) || null,
    avatar_url: (v.avatar_url as string) || null,
    ...v,
  } as VideoRecord;
}

async function fetchAllVideos(): Promise<{ videos: VideoRecord[]; error: string | null }> {
  const [dbRes, vimeoVideos] = await Promise.all([
    supabase.from('videos').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(100),
    fetchVimeoVideos(),
  ]);
  if (dbRes.error) console.error(dbRes.error);
  const dbVideos = dbRes.error ? [] : ((dbRes.data || []) as Record<string, unknown>[]).map(normalizeVideo);
  return { videos: mergeVideos(dbVideos, vimeoVideos), error: dbRes.error?.message ?? null };
}

let videoCache: VideoRecord[] | null = null;
let profileCache: Record<string, ProfileRecord> = {};
export function invalidateVideoCache() { videoCache = null; }

export function useVideos() {
  const [videos, setVideos] = useState<VideoRecord[]>(() => videoCache || []);
  const [loading, setLoading] = useState(videoCache === null);
  const [error, setError] = useState<string | null>(null);
  const loadVideos = useCallback(async () => {
    try {
      const result = await fetchAllVideos();
      videoCache = result.videos; setVideos(result.videos); setError(result.error);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load videos'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void loadVideos();
    const interval = setInterval(() => { void loadVideos(); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadVideos]);
  return { videos, loading, error, reload: loadVideos, setVideos };
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const user = await getCurrentAuthUser();
      if (!user) { setProfile(null); setLoading(false); return; }
      const p = await getOrCreateCurrentProfile(user.id);
      setProfile(p as ProfileRecord); setLoading(false);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) { setProfile(null); return; }
      const p = await getOrCreateCurrentProfile(session.user.id);
      setProfile(p as ProfileRecord);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return { profile, setProfile, loading };
}

export function useProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  useEffect(() => {
    if (userIds.length === 0) return;
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const uncached = uniqueIds.filter((id) => !profileCache[id]);
    if (uncached.length === 0) { setProfiles((prev) => ({ ...prev, ...Object.fromEntries(uniqueIds.map((id) => [id, profileCache[id]])) })); return; }
    (async () => {
      const { data } = await supabase.from('profiles').select('*').in('id', uncached);
      if (data) {
        const map: Record<string, ProfileRecord> = {};
        data.forEach((p) => { map[p.id] = p as ProfileRecord; profileCache[p.id] = p as ProfileRecord; });
        setProfiles((prev) => ({ ...prev, ...map, ...Object.fromEntries(uniqueIds.map((id) => [id, profileCache[id]])) }));
      }
    })();
  }, [userIds.join(',')]);
  return profiles;
}

export function useCommentCount(videoId: string) {
  const [count, setCount] = useState(0);
  useEffect(() => { (async () => { const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', videoId); setCount(count || 0); })(); }, [videoId]);
  return count;
}

export function useComments(videoId: string) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: false });
    setComments((data || []) as CommentRecord[]); setLoading(false);
  }, [videoId]);
  useEffect(() => { load(); }, [load]);
  const addComment = async (text: string, userId: string) => { await supabase.from('comments').insert({ video_id: videoId, user_id: userId, text }); await load(); };
  return { comments, loading, addComment, reload: load };
}

export function useLikeToggle(videoId: string, currentLikes: number, userId: string) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(currentLikes);
  useEffect(() => {
    setLikeCount(currentLikes);
    if (!userId) return;
    (async () => { const { data } = await supabase.from('likes').select('id').eq('video_id', videoId).eq('user_id', userId).maybeSingle(); setLiked(!!data); })();
  }, [videoId, currentLikes, userId]);
  const toggleLike = async () => {
    if (!userId) return;
    if (liked) {
      await supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', userId);
      const newCount = likeCount - 1; setLikeCount(newCount); setLiked(false);
      await supabase.from('videos').update({ likes: newCount }).eq('id', videoId);
    } else {
      await supabase.from('likes').insert({ video_id: videoId, user_id: userId });
      const newCount = likeCount + 1; setLikeCount(newCount); setLiked(true);
      await supabase.from('videos').update({ likes: newCount }).eq('id', videoId);
    }
  };
  return { liked, likeCount, toggleLike };
}

export function useAds() {
  const [ads, setAds] = useState<AdRecord[]>([]);
  useEffect(() => { (async () => { const { data } = await supabase.from('ads').select('*').eq('active', true).order('created_at', { ascending: false }); if (data) setAds(data as AdRecord[]); })(); }, []);
  return { ads };
}

export function useWatchTime(active: boolean) {
  const [state, setState] = useState<WatchState>(() => loadWatchState());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) { intervalRef.current = setInterval(() => { setState((prev) => { const next = { ...prev, totalSeconds: prev.totalSeconds + 1 }; saveWatchState(next.totalSeconds); return next; }); }, 1000); }
    else if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);
  const claimReward = useCallback(() => { setState((prev) => { const next = { ...prev, claimedRewards: prev.claimedRewards + 50 }; saveClaimedRewards(next.claimedRewards); return next; }); }, []);
  return { state, claimReward };
  }
