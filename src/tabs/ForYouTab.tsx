import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, Heart, MessageCircle, Music2, Plus, Send, Share2, X } from 'lucide-react';
import { useComments, useLikeToggle, useProfiles, useVideos } from '@/lib/hooks';
import { type VideoRecord, supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import OrnexLogo from '@/components/OrnexLogo';

function isShort(video: VideoRecord) {
  return video.is_live !== true && (video.type === 'SHORT' || video.orientation === 'portrait' || (typeof video.duration_seconds === 'number' && video.duration_seconds <= 60));
}

export default function ForYouTab({ onPostClick }: { onPostClick: () => void }) {
  const { videos, loading } = useVideos();
  const shorts = useMemo(() => videos.filter(isShort).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)), [videos]);

  return <div aria-label="For You short videos" className="relative h-full snap-y snap-mandatory overflow-y-auto bg-black text-white [scrollbar-width:none]">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-center bg-gradient-to-b from-black/70 to-transparent"><OrnexLogo size={23}/></div>
    {shorts.length === 0 ? <section className="flex h-full snap-start flex-col items-center justify-center px-8 text-center">
      <OrnexLogo size={28}/><p className="mt-5 text-xl font-bold">No short videos yet</p>
      <p className="mt-2 text-sm text-white/70">Be the first to share a short video.</p>
      <button onClick={onPostClick} className="mt-5 flex items-center gap-2 bg-[#D61E2B] px-5 py-3 font-bold"><Plus className="h-5 w-5"/>Post first</button>
      {loading && <p className="mt-4 text-sm text-white/60">Loading videos…</p>}
    </section> : shorts.map((video) => <ShortSlide key={video.id} video={video}/>) }
  </div>;
}

function ShortSlide({ video }: { video: VideoRecord }) {
  const [userId, setUserId] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const profileIds = useMemo(() => video.user_id ? [video.user_id] : [], [video.user_id]);
  const profiles = useProfiles(profileIds);
  const profile = video.user_id ? profiles[video.user_id] : undefined;
  const { liked, likeCount, toggleLike } = useLikeToggle(video.id, video.likes || 0, userId);
  const username = profile?.username || video.username || 'ornex';
  const displayName = profile?.display_name || video.display_name || username;
  const avatar = profile?.avatar_url || video.avatar_url;
  const vimeoId = getVimeoId(video.vimeo_url);

  useEffect(() => { void getCurrentUserId().then((id) => setUserId(id || '')); }, []);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void Promise.all([
      video.user_id && userId !== video.user_id ? supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', video.user_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('saved_videos').select('id').eq('user_id', userId).eq('video_id', video.id).maybeSingle(),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('video_id', video.id),
    ]).then(([follow, save, comments]) => {
      if (cancelled) return;
      setFollowing(!!follow.data);
      setSaved(!!save.data);
      setCommentCount(comments.count || 0);
    });
    return () => { cancelled = true; };
  }, [userId, video.id, video.user_id]);

  const requireUser = () => {
    if (userId) return true;
    window.alert('Please sign in to interact with videos.');
    return false;
  };
  const toggleFollow = async () => {
    if (!requireUser() || !video.user_id || userId === video.user_id || busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    const result = next
      ? await supabase.from('follows').insert({ follower_id: userId, following_id: video.user_id })
      : await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', video.user_id);
    if (result.error) { setFollowing(!next); window.alert('Could not update subscription. Please try again.'); }
    setBusy(false);
  };
  const toggleSave = async () => {
    if (!requireUser() || busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    const result = next
      ? await supabase.from('saved_videos').insert({ user_id: userId, video_id: video.id })
      : await supabase.from('saved_videos').delete().eq('user_id', userId).eq('video_id', video.id);
    if (result.error) { setSaved(!next); window.alert('Could not update saved videos. Please try again.'); }
    setBusy(false);
  };
  const share = async () => {
    if (!requireUser()) return;
    const shareData = { title: video.title || 'ORNEX Short', text: video.caption || '', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(`${shareData.title} ${shareData.url}`);
      const { error } = await supabase.from('video_shares').insert({ video_id: video.id, user_id: userId });
      if (error) window.alert('The video was shared, but we could not save the share to your account.');
    } catch { /* User cancelled sharing or clipboard permission was denied. */ }
  };

  return <article className="relative h-full min-h-full snap-start snap-always overflow-hidden bg-black">
    {vimeoId ? <iframe src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&muted=1&loop=1`} title={video.title || 'ORNEX Short'} allow="autoplay; fullscreen; picture-in-picture" className="absolute inset-0 h-full w-full border-0"/> : video.url ? <video src={video.url} poster={video.thumbnail_url || undefined} autoPlay muted loop playsInline controls={false} className="absolute inset-0 h-full w-full object-cover" aria-label={video.title || 'Short video'}/> : <div className="absolute inset-0 flex items-center justify-center bg-neutral-900"><OrnexLogo size={30}/></div>}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black via-black/55 to-transparent"/>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-8 pr-[5.2rem]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-10 w-10 shrink-0 rounded-full border-2 border-[#D61E2B] bg-black p-0.5">{avatar ? <img src={avatar} alt={`${displayName}'s profile`} className="h-full w-full rounded-full object-cover"/> : <span className="flex h-full w-full items-center justify-center rounded-full bg-white/15 text-sm font-bold">{username.slice(0, 1).toUpperCase()}</span>}</div>
          <p className="truncate text-sm font-bold text-white">@{username}</p>
          {video.user_id && userId !== video.user_id && <button onClick={() => void toggleFollow()} className="pointer-events-auto rounded-full bg-white px-3 py-1 text-xs font-bold text-black">{following ? 'Subscribed' : 'Subscribe'}</button>}
        </div>
        <h2 className="line-clamp-2 text-base font-bold text-white">{video.title || 'Untitled video'}</h2>
        {video.caption && <p className="mt-1 line-clamp-2 text-sm text-white">{video.caption}</p>}
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-white/75"><Music2 className="h-3.5 w-3.5 shrink-0"/> {video.category || 'Original audio'} · {username}</p>
      </div>
    </div>
    <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-5">
      <button onClick={() => void toggleLike()} aria-label={liked ? 'Unlike video' : 'Like video'} className="flex flex-col items-center gap-1 text-white"><Heart className={`h-7 w-7 ${liked ? 'fill-[#D61E2B] text-[#D61E2B]' : ''}`}/><span className="text-xs font-semibold">{likeCount}</span></button>
      <button onClick={() => setCommentsOpen(true)} aria-label="Open comments" className="flex flex-col items-center gap-1 text-white"><MessageCircle className="h-7 w-7"/><span className="text-xs font-semibold">{commentCount}</span></button>
      <button onClick={() => void toggleSave()} aria-label={saved ? 'Remove from saved videos' : 'Save video'} className="flex flex-col items-center gap-1 text-white"><Bookmark className={`h-7 w-7 ${saved ? 'fill-white' : ''}`}/><span className="text-xs font-semibold">{saved ? 'Saved' : 'Save'}</span></button>
      <button onClick={() => void share()} aria-label="Share video" className="flex flex-col items-center gap-1 text-white"><Share2 className="h-7 w-7"/><span className="text-xs font-semibold">Share</span></button>
    </div>
    {commentsOpen && <CommentsSheet video={video} userId={userId} onClose={() => setCommentsOpen(false)} onCountChange={setCommentCount}/>}
  </article>;
}

function getVimeoId(value?: string | null) {
  if (!value) return null;
  return value.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/i)?.[1] || null;
}

function CommentsSheet({ video, userId, onClose, onCountChange }: { video: VideoRecord; userId: string; onClose: () => void; onCountChange: (count: number) => void }) {
  const { comments, loading, addComment } = useComments(video.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { onCountChange(comments.length); }, [comments.length, onCountChange]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !userId || sending) return;
    setSending(true);
    await addComment(value, userId);
    setText('');
    setSending(false);
  };
  return <div className="absolute inset-0 z-40 flex items-end bg-black/55" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Comments" onClick={(event) => event.stopPropagation()} className="flex max-h-[72%] w-full flex-col rounded-t-2xl border-t border-white/20 bg-[#101010]">
      <header className="flex items-center justify-between border-b border-white/15 px-4 py-3"><h3 className="font-bold">Comments · {comments.length}</h3><button onClick={onClose} aria-label="Close comments"><X className="h-5 w-5"/></button></header>
      <div className="min-h-24 flex-1 space-y-4 overflow-y-auto p-4">{loading ? <p className="text-sm text-white/60">Loading comments…</p> : comments.length ? comments.map((comment) => <div key={comment.id} className="flex items-start gap-2 text-sm">
        {comment.avatar_url ? <img src={comment.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover"/> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">{(comment.username || 'U').slice(0, 1).toUpperCase()}</span>}
        <p><span className="mr-2 font-bold">{comment.display_name || comment.username || 'ORNEX user'}</span>{comment.text}</p>
      </div>) : <p className="py-8 text-center text-sm text-white/60">Be the first to comment.</p>}</div>
      <form onSubmit={(event) => void submit(event)} className="flex gap-2 border-t border-white/15 p-3"><input value={text} onChange={(event) => setText(event.target.value)} placeholder={userId ? 'Add a comment…' : 'Sign in to comment'} disabled={!userId || sending} className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none"/><button type="submit" disabled={!text.trim() || !userId || sending} aria-label="Send comment" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D61E2B] disabled:opacity-50"><Send className="h-4 w-4"/></button></form>
    </section>
  </div>;
}
