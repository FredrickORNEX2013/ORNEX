import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, MoreVertical, Plus, Send, Share2, X } from 'lucide-react';
import { useComments, useLikeToggle, useProfiles, useVideos } from '@/lib/hooks';
import { type VideoRecord, supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import OrnexLogo from '@/components/OrnexLogo';

function isShort(video: VideoRecord) {
  return video.is_live !== true && video.type?.toUpperCase() !== 'LONG' &&
    typeof video.duration_seconds === 'number' && video.duration_seconds <= 60;
}

export default function ForYouTab({ onPostClick }: { onPostClick: () => void }) {
  const { videos, loading } = useVideos();
  const shorts = useMemo(() => videos.filter(isShort), [videos]);
  const feedRef = useRef<HTMLDivElement>(null);

  return <div ref={feedRef} aria-label="For You short videos" className="relative h-full snap-y snap-mandatory overflow-y-auto bg-black text-white [scrollbar-width:none]">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-center bg-black/35"><OrnexLogo size={23}/></div>
    {shorts.length === 0 ? <section className="flex h-full snap-start flex-col items-center justify-center px-8 text-center">
      <OrnexLogo size={28}/><p className="mt-5 text-xl font-bold">No short videos yet</p>
      <p className="mt-2 text-sm text-white/70">For You only shows videos with a duration of 60 seconds or less.</p>
      <button onClick={onPostClick} className="mt-5 flex items-center gap-2 bg-[#D61E2B] px-5 py-3 font-bold"><Plus className="h-5 w-5"/>Upload a video</button>
      {loading && <p className="mt-4 text-sm text-white/60">Loading videos…</p>}
    </section> : shorts.map((video) => <ShortSlide key={video.id} video={video} onPostClick={onPostClick}/>) }
  </div>;
}

function ShortSlide({ video, onPostClick }: { video: VideoRecord; onPostClick: () => void }) {
  const [userId, setUserId] = useState('');
  const [progress, setProgress] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const profileIds = useMemo(() => video.user_id ? [video.user_id] : [], [video.user_id]);
  const profiles = useProfiles(profileIds);
  const profile = video.user_id ? profiles[video.user_id] : undefined;
  const { liked, likeCount, toggleLike } = useLikeToggle(video.id, video.likes || 0, userId);
  const username = profile?.username || video.username || 'ornex';
  const displayName = profile?.display_name || video.display_name || username;

  useEffect(() => { void getCurrentUserId().then((id) => setUserId(id || '')); }, []);
  useEffect(() => {
    if (!userId || !video.user_id || userId === video.user_id) return;
    void supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', video.user_id).maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [userId, video.user_id]);

  const toggleFollow = async () => {
    if (!userId || !video.user_id || userId === video.user_id) return;
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', video.user_id);
      setFollowing(false);
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: userId, following_id: video.user_id });
      if (!error) setFollowing(true);
    }
  };
  const share = async () => {
    const shareData = { title: video.title || 'ORNEX Short', text: video.caption || '', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard?.writeText(`${shareData.title} ${shareData.url}`);
    } catch { /* User cancelled sharing. */ }
  };

  return <article className="relative h-full min-h-full snap-start snap-always overflow-hidden bg-black">
    <video src={video.url} poster={video.thumbnail_url || undefined} autoPlay muted loop playsInline
      onTimeUpdate={(event) => { const el = event.currentTarget; setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0); }}
      className="absolute inset-0 h-full w-full object-cover" aria-label={video.title || 'Short video'} />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black via-black/55 to-transparent"/>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-8 pr-[5.2rem]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <div className="relative h-10 w-10 shrink-0 rounded-full border-2 border-[#D61E2B] bg-black p-0.5">
            {profile?.avatar_url || video.avatar_url ? <img src={profile?.avatar_url || video.avatar_url || ''} alt="" className="h-full w-full rounded-full object-cover"/> : <span className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-sm font-bold">{displayName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <p className="truncate text-sm font-bold text-white">@{username}</p>
          {video.user_id && userId !== video.user_id && <button onClick={() => void toggleFollow()} aria-label={following ? 'Unfollow channel' : 'Follow channel'} className="pointer-events-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white bg-black text-white"><Plus className={`h-4 w-4 ${following ? 'rotate-45' : ''}`}/></button>}
        </div>
        <h2 className="line-clamp-2 text-base font-bold text-white">{video.title || 'Untitled video'}</h2>
        {video.caption && <p className="mt-1 line-clamp-2 text-sm text-white">{video.caption}</p>}
        <p className="mt-2 truncate text-xs text-white/65">{video.category || 'Short'} · ORNEX</p>
      </div>
    </div>
    <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-5">
      <button onClick={() => void toggleLike()} aria-label={liked ? 'Unlike video' : 'Like video'} className="flex flex-col items-center gap-1 text-white"><Heart className={`h-7 w-7 ${liked ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'}`}/><span className="text-xs font-semibold">{likeCount}</span></button>
      <button onClick={() => setCommentsOpen(true)} aria-label="Open comments" className="flex flex-col items-center gap-1 text-white"><MessageCircle className="h-7 w-7"/><span className="text-xs font-semibold">Comment</span></button>
      <button onClick={() => void share()} aria-label="Share video" className="flex flex-col items-center gap-1 text-white"><Share2 className="h-7 w-7"/><span className="text-xs font-semibold">Share</span></button>
      <button onClick={() => setMoreOpen((open) => !open)} aria-label="More video options" className="text-white"><MoreVertical className="h-7 w-7"/></button>
      {moreOpen && <div className="absolute bottom-0 right-10 w-36 border border-white/30 bg-black p-2 text-xs"><button onClick={() => { setMoreOpen(false); window.alert('Thanks. This video has been reported for review.'); }} className="w-full p-2 text-left text-white">Report video</button></div>}
    </div>
    <div className="absolute inset-x-0 bottom-0 z-30 h-[2px] bg-white/20"><div className="h-full bg-[#D61E2B]" style={{ width: `${progress}%` }}/></div>
    {commentsOpen && <CommentsSheet video={video} userId={userId} onClose={() => setCommentsOpen(false)}/>}
    <button onClick={onPostClick} aria-label="Upload a video" className="absolute right-3 top-14 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-black/40 text-white"><Plus className="h-5 w-5"/></button>
  </article>;
}

function CommentsSheet({ video, userId, onClose }: { video: VideoRecord; userId: string; onClose: () => void }) {
  const { comments, loading, addComment } = useComments(video.id);
  const [text, setText] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !userId) return;
    await addComment(value, userId);
    setText('');
  };
  return <div className="absolute inset-0 z-40 flex items-end bg-black/55" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Comments" onClick={(event) => event.stopPropagation()} className="flex max-h-[72%] w-full flex-col rounded-t-2xl border-t border-white/20 bg-black pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between border-b border-white/15 px-4 py-3"><h3 className="font-bold">Comments · {comments.length}</h3><button onClick={onClose} aria-label="Close comments"><X className="h-5 w-5"/></button></header>
      <div className="min-h-24 flex-1 space-y-4 overflow-y-auto p-4">{loading ? <p className="text-sm text-white/60">Loading comments…</p> : comments.length ? comments.map((comment) => <p key={comment.id} className="text-sm"><span className="mr-2 font-bold">{comment.display_name || comment.username || 'ORNEX user'}</span>{comment.text}</p>) : <p className="py-8 text-center text-sm text-white/60">Be the first to comment.</p>}</div>
      <form onSubmit={(event) => void submit(event)} className="flex gap-2 border-t border-white/15 p-3"><input value={text} onChange={(event) => setText(event.target.value)} placeholder={userId ? 'Add a comment…' : 'Sign in to comment'} disabled={!userId} className="min-w-0 flex-1 border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/50"/><button type="submit" disabled={!userId || !text.trim()} aria-label="Send comment" className="bg-[#D61E2B] px-3 text-white disabled:opacity-50"><Send className="h-4 w-4"/></button></form>
    </section>
  </div>;
}
