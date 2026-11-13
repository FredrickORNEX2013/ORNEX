import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Heart, MessageCircle, Music2, Share2, UserPlus, X } from 'lucide-react';
import { useComments, useLikeToggle, useProfiles, useVideos } from '@/lib/hooks';
import { supabase, type VideoRecord } from '@/lib/supabase';
import { getCurrentUserId, getGuestProfile } from '@/lib/user';
import OrnexLogo from '@/components/OrnexLogo';

export default function ForYouTab({ onPostClick }: { onPostClick: () => void }) {
  const { videos } = useVideos();
  const shorts = useMemo(() => videos.filter((video) => video.is_live !== true).sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at)), [videos]);
  return <div aria-label="For You short videos" className="relative h-full snap-y snap-mandatory overflow-y-auto bg-black text-white [scrollbar-width:none]">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-center bg-gradient-to-b from-black/70 to-transparent"><OrnexLogo size={23}/></div>
    {shorts.map((video) => <ShortSlide key={video.id} video={video}/>)}
    <button onClick={onPostClick} className="fixed bottom-24 right-4 z-30 rounded-full bg-[#D61E2B] px-4 py-3 text-sm font-bold">＋ Post</button>
  </div>;
}
function ShortSlide({ video }: { video: VideoRecord }) {
  const guest = getGuestProfile(); const [userId, setUserId] = useState(guest.id); const [commentsOpen, setCommentsOpen] = useState(false); const [following, setFollowing] = useState(false); const [commentCount, setCommentCount] = useState(0);
  const profiles = useProfiles(video.user_id ? [video.user_id] : []); const owner = video.guest_id || video.user_id; const profile = owner ? profiles[owner] : undefined;
  const { liked, likeCount, toggleLike } = useLikeToggle(video.id, video.likes || 0, userId); const { comments, addComment } = useComments(video.id);
  useEffect(() => { void getCurrentUserId().then(setUserId); }, []);
  useEffect(() => { setCommentCount(comments.length); }, [comments.length]);
  useEffect(() => { if (!owner || owner === userId || video.id.startsWith('sample-') || video.id.startsWith('pexels-')) return; void supabase.from('follows').select('follower_id').eq('follower_id', userId).eq('following_id', owner).maybeSingle().then(({data}) => setFollowing(!!data)); }, [owner,userId,video.id]);
  const name = profile?.display_name || video.display_name || video.username || 'ORNEX';
  const follow = async () => { if (!owner || owner === userId) return; const next = !following; setFollowing(next); const result = next ? await supabase.from('follows').insert({follower_id:userId,following_id:owner}) : await supabase.from('follows').delete().eq('follower_id',userId).eq('following_id',owner); if (result.error) setFollowing(!next); };
  const share = async () => { try { if (navigator.share) await navigator.share({title:video.title || 'ORNEX video',url:video.url}); else await navigator.clipboard.writeText(video.url); } catch { /* dismissed */ } };
  return <article className="relative h-full min-h-full snap-start snap-always overflow-hidden bg-black">
    <video src={video.url} poster={video.thumbnail_url || undefined} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" aria-label={video.title || 'Short video'}/>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black via-black/55 to-transparent"/>
    <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-5">
      <button onClick={() => void toggleLike()} aria-label="Like video" className="flex flex-col items-center"><Heart className={`h-7 w-7 ${liked?'fill-[#D61E2B] text-[#D61E2B]':'text-white'}`}/><span className="text-xs">{likeCount}</span></button>
      <button onClick={() => setCommentsOpen(true)} aria-label="Comments" className="flex flex-col items-center"><MessageCircle className="h-7 w-7"/><span className="text-xs">{commentCount}</span></button>
      <button onClick={() => void share()} aria-label="Share video"><Share2 className="h-7 w-7"/></button>
      {owner && owner !== userId && <button onClick={() => void follow()} aria-label="Follow creator"><UserPlus className={`h-7 w-7 ${following?'text-[#D61E2B]':''}`}/></button>}
    </div>
    <div className="absolute bottom-8 left-4 z-10 max-w-[75%]"><p className="mb-2 text-sm font-bold">@{name}</p><h2 className="font-bold">{video.title || 'Untitled video'}</h2>{video.caption && <p className="mt-1 text-sm">{video.caption}</p>}<p className="mt-2 flex items-center gap-1 text-xs text-white/75"><Music2 className="h-3 w-3"/>{video.category || 'Original audio'}</p></div>
    {commentsOpen && <CommentsSheet video={video} userId={userId} onClose={() => setCommentsOpen(false)} onAdd={addComment}/>}
  </article>;
}
function CommentsSheet({video,userId,onClose,onAdd}:{video:VideoRecord;userId:string;onClose:()=>void;onAdd:(text:string,userId:string)=>Promise<void>}) {
  const {comments,loading}=useComments(video.id); const [text,setText]=useState('');
  return <div className="absolute inset-0 z-40 flex items-end bg-black/55" onClick={onClose}><section className="max-h-[75%] w-full overflow-y-auto rounded-t-2xl bg-[#141414] p-4" onClick={(event)=>event.stopPropagation()}><div className="mb-3 flex justify-between"><h2 className="font-bold">Comments</h2><button onClick={onClose}><X/></button></div>{loading&&<p>Loading…</p>}{comments.map((comment)=><p key={comment.id} className="border-b border-white/10 py-2"><b>{comment.display_name||comment.username||'Guest'}</b> {comment.text}</p>)}<form className="mt-3 flex gap-2" onSubmit={(event)=>{event.preventDefault();if(text.trim()){void onAdd(text,userId);setText('');}}}><input value={text} onChange={(event)=>setText(event.target.value)} className="min-w-0 flex-1 rounded-full bg-black px-4 py-2" placeholder="Add a comment"/><button className="text-[#D61E2B]">Post</button></form></section></div>;
}
