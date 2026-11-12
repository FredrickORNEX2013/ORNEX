import { useEffect, useState, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Play, Video, X, Send, Volume2, VolumeX, Search } from 'lucide-react';
import { type VideoRecord, type ProfileRecord, type CommentRecord } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import { useVideos, useLikeToggle, useWatchTime, useProfiles, useComments, useCommentCount } from '@/lib/hooks';
import { formatViews } from '@/lib/format';
import { downloadVideo } from '@/lib/download';
import Avatar from '@/components/Avatar';
import VideoPlayer from '@/components/VideoPlayer';
type ForYouProps = { onPostClick: () => void; };
const PRELOAD_AHEAD = 2;
export default function ForYouTab({ onPostClick }: ForYouProps) {
  const { videos, reload } = useVideos();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { getCurrentUserId().then(setUserId); }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  useWatchTime(true);
  const allVideos = videos;
  const userIds = allVideos.map((v) => v.user_id).filter(Boolean) as string[];
  const profiles = useProfiles(userIds);
  const filteredVideos = searchQuery.trim() ? allVideos.filter((v) => { const q = searchQuery.toLowerCase(); const title = (v.title || v.caption || '').toLowerCase(); const profile = v.user_id ? profiles[v.user_id] : undefined; const username = (profile?.username || '').toLowerCase(); const displayName = (profile?.display_name || '').toLowerCase(); return title.includes(q) || username.includes(q) || displayName.includes(q); }) : allVideos;
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollToIndex = useCallback((idx: number) => { const container = containerRef.current; if (!container) return; const clamped = Math.max(0, Math.min(idx, filteredVideos.length - 1)); const items = container.querySelectorAll('[data-feed-item]'); items[clamped]?.scrollIntoView({ behavior: 'smooth' }); setCurrentIndex(clamped); }, [filteredVideos.length]);
  useEffect(() => { const container = containerRef.current; if (!container || filteredVideos.length === 0) return; const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting && entry.intersectionRatio > 0.6) { setCurrentIndex(Number(entry.target.getAttribute('data-index'))); } }); }, { root: container, threshold: [0.6] }); container.querySelectorAll('[data-feed-item]').forEach((item) => observer.observe(item)); return () => observer.disconnect(); }, [filteredVideos.length]);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => { const deltaY = touchStartY.current - e.changedTouches[0].clientY; if (Math.abs(deltaY) > 50) { scrollToIndex(deltaY > 0 ? currentIndex + 1 : currentIndex - 1); } };
  if (allVideos.length === 0) { return (<div className="flex h-[100dvh] flex-col items-center justify-center px-6 text-center bg-black"><Video className="mb-4 h-16 w-16 text-white" /><p className="text-lg font-bold text-white">No Vimeo videos yet</p></div>); }
  if (filteredVideos.length === 0) { return (<div><div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-3 pb-2"><span className="text-lg font-extrabold text-white">ORNEX</span><button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40"><Search className="h-5 w-5 text-white" /></button></div><div className="flex h-[100dvh] flex-col items-center justify-center px-6 text-center"><Search className="mb-3 h-12 w-12 text-white" /><p className="text-lg font-bold text-white">No results</p><p className="mt-1 text-sm text-white/60">Try a different search term</p></div></div>); }
  return (<div><div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-3 pb-2"><span className="text-lg font-extrabold text-white">ORNEX</span><button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40"><Search className="h-5 w-5 text-white" /></button></div>{searchOpen && (<div className="fixed top-14 left-0 right-0 z-40 px-4"><div className="flex items-center rounded-full border border-white/10 bg-black/60 px-3 py-2"><Search className="h-4 w-4 text-white/70" /><input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search videos or users..." className="ml-2 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" /></div></div>)}<div ref={containerRef} className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>{filteredVideos.map((video, index) => (<VideoShort key={video.id} video={video} profile={video.user_id ? profiles[video.user_id] : undefined} index={index} isActive={index === currentIndex} shouldPreload={Math.abs(index - currentIndex) <= PRELOAD_AHEAD} userId={userId || ''} onLiked={reload} onEnded={() => scrollToIndex(index + 1)} />))}</div></div>);
}
function VideoShort({ video, profile, index, isActive, shouldPreload, userId, onLiked, onEnded }: { video: VideoRecord; profile?: ProfileRecord; index: number; isActive: boolean; shouldPreload: boolean; userId: string; onLiked: () => void; onEnded: () => void; }) {
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { liked, likeCount, toggleLike } = useLikeToggle(video.id, video.likes, userId);
  const commentCount = useCommentCount(video.id);
  const handleLike = async () => { await toggleLike(); onLiked(); };
  const handleShare = async () => { try { await navigator.share?.({ url: video.url, title: video.caption || video.title || 'ORNEX video' }); } catch {} };
  const handleSave = async () => { try { await downloadVideo(video.url, `ornex-${video.id}.mp4`); setSaved(true); setDownloaded(true); setTimeout(() => setDownloaded(false), 2000); } catch { setSaved(!saved); } };
  const displayName = profile?.display_name || 'ORNEX User';
  const username = profile?.username || 'ornex_user';
  const avatarColor = profile?.avatar_color || '#D61E2B';
  return (<div data-feed-item data-index={index} className="relative flex h-[100dvh] w-screen snap-start items-center justify-center bg-black"><div className="relative h-full w-full"><VideoPlayer src={video.url} thumbnailUrl={video.thumbnail_url} isActive={isActive} shouldPreload={shouldPreload} loop muted={muted} onEnded={onEnded} onMuteToggle={setMuted} /><button onClick={(e) => { e.stopPropagation(); setMuted(!muted); }} className="absolute top-24 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50">{muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}</button><div className="absolute bottom-24 left-4 right-20 z-20 text-white"><div className="mb-2 flex items-center gap-2"><Avatar name={displayName} color={avatarColor} size={36} /><div><p className="text-sm font-bold">{displayName}</p><p className="text-xs text-white/70">@{username}</p></div></div><p className="text-sm">{video.caption || video.title}</p><p className="mt-1 text-xs text-white/60">{formatViews(video.views)} views</p></div><div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-5"><button onClick={handleLike} className="flex flex-col items-center gap-1"><Heart className={`h-7 w-7 ${liked ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'}`} /><span className="text-xs text-white">{formatViews(likeCount)}</span></button><button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1"><MessageCircle className="h-7 w-7 text-white" /><span className="text-xs text-white">{commentCount}</span></button><button onClick={handleSave} className="flex flex-col items-center gap-1"><Bookmark className={`h-7 w-7 ${saved ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'}`} /><span className="text-xs text-white">{downloaded ? 'Saved' : 'Save'}</span></button><button onClick={handleShare} className="flex flex-col items-center gap-1"><Share2 className="h-7 w-7 text-white" /><span className="text-xs text-white">Share</span></button></div></div>{showComments && <CommentsSheet videoId={video.id} userId={userId} onClose={() => setShowComments(false)} />}</div>);
}
function CommentsSheet({ videoId, userId, onClose }: { videoId: string; userId: string; onClose: () => void }) {
  const { comments, addComment } = useComments(videoId);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  const handleSend = async () => { if (!text.trim()) return; await addComment(text.trim(), userId); setText(''); };
  return (<div className="fixed bottom-0 left-0 right-0 z-[99999] flex h-[60vh] flex-col rounded-t-2xl bg-[#1A1A1A]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="text-sm font-semibold text-white">Comments</span><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full"><X className="h-5 w-5 text-white" /></button></div><div className="flex-1 overflow-y-auto px-4 py-3">{comments.length === 0 ? (<p className="py-10 text-center text-sm text-white/50">No comments yet. Be the first!</p>) : (<div className="space-y-3">{comments.map((c: CommentRecord) => (<div key={c.id} className="flex items-start gap-2"><Avatar name={c.display_name || c.username || 'User'} color="#D61E2B" size={30} /><div><p className="text-xs font-bold text-white">{c.display_name || c.username || 'User'}</p><p className="text-sm text-white/80">{c.text}</p></div></div>))}</div>)}</div><div className="flex gap-2 border-t border-white/10 p-3"><input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Add a comment..." className="flex-1 rounded-full bg-black px-4 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none" /><button onClick={handleSend} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D61E2B]"><Send className="h-4 w-4 text-white" /></button></div></div>);
}
