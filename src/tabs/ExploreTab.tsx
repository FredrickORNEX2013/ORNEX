import { useEffect, useMemo, useState } from 'react';
import { Play, Radio, Search, X } from 'lucide-react';
import { useProfiles, useVideos } from '@/lib/hooks';
import { supabase, type VideoRecord } from '@/lib/supabase';

const CATEGORIES = ['All', 'Comedy', 'Drama', 'Entertainment', 'Live'] as const;
function vimeoId(video: VideoRecord) { const value = video.vimeo_url || video.url; return value?.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/i)?.[1] || null; }
function youtubeId(video: VideoRecord) { const value = video.youtube_url || video.url; return value?.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)?.[1] || null; }
export default function ExploreTab() {
  const { videos, loading, error } = useVideos();
  const [active, setActive] = useState<string>('All');
  const [channel, setChannel] = useState('All Channels');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<VideoRecord | null>(null);
  const source = useMemo(() => videos, [videos]);
  const channels = useMemo(() => [...new Set(source.filter((v) => v.is_channel && v.user_id).map((v) => v.user_id as string))], [source]);
  const channelProfiles = useProfiles(channels);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return source.filter((video) => {
      const isLive = video.is_live === true;
      if (active === 'Live' ? !isLive : (isLive || (active !== 'All' && video.category?.toLowerCase() !== active.toLowerCase()))) return false;
      if (channel !== 'All Channels' && video.user_id !== channel) return false;
      const profile = video.user_id ? channelProfiles[video.user_id] : undefined;
      return !term || [video.title, video.caption, video.category, profile?.username, profile?.display_name].filter(Boolean).join(' ').toLowerCase().includes(term);
    }).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [source, active, channel, query, channelProfiles]);
  const profiles = useProfiles(useMemo(() => filtered.map((video) => video.user_id).filter(Boolean) as string[], [filtered]));
  return <div className="h-full overflow-y-auto bg-black pb-24 text-white">
    <div className="px-4 pt-4"><h1 className="text-2xl font-bold">Explore</h1><label className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 px-3 py-2"><Search className="h-4 w-4 shrink-0"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos, creators, categories" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label></div>
    <div role="tablist" aria-label="Explore categories" className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">{CATEGORIES.map((category) => <button key={category} role="tab" aria-selected={active === category} onClick={() => setActive(category)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${active === category ? 'bg-[#D61E2B] text-white' : 'bg-white/10 text-white/70'}`}>{category === 'Live' && <Radio className="mr-1 inline h-3 w-3"/>}{category}</button>)}</div>
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"><button onClick={() => setChannel('All Channels')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${channel === 'All Channels' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>All Channels</button>{channels.slice(0, 4).map((id) => <button key={id} onClick={() => setChannel(id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${channel === id ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>{channelProfiles[id]?.display_name || channelProfiles[id]?.username || 'Channel'}</button>)}</div>
    {loading && !videos.length ? <p className="px-4 py-10 text-center text-sm text-white/60">Loading videos…</p> : error ? <p role="alert" className="px-4 py-10 text-center text-sm text-red-400">Could not load videos: {error}</p> : !filtered.length ? <p className="px-4 py-10 text-center text-sm text-white/60">No videos found.</p> : <div className="grid grid-cols-2 gap-2 px-2">{filtered.map((video) => { const ytId = youtubeId(video); const vmId = vimeoId(video); return <button key={video.id} onClick={() => setOpen(video)} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-neutral-900 text-left">
      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : ytId ? <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 flex items-center justify-center bg-neutral-900"><Play className="h-8 w-8 text-white/50"/></div>}
      {video.is_live && <span className="absolute left-2 top-2 flex items-center gap-1 bg-[#D61E2B] px-2 py-1 text-[10px] font-bold"><Radio className="h-3 w-3"/>LIVE</span>}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10"/><Play className="absolute right-2 top-2 h-5 w-5 fill-white drop-shadow"/><div className="absolute inset-x-2 bottom-2"><p className="line-clamp-2 text-sm font-semibold">{video.title || 'Untitled video'}</p><p className="mt-1 truncate text-xs text-white/70">{profiles[video.user_id || '']?.display_name || video.category || 'ORNEX'}</p></div>{vmId && <span className="sr-only">Vimeo video</span>}
    </button>; })}</div>}
    {open && <div role="dialog" aria-modal="true" aria-label={open.title || 'Video player'} className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={() => setOpen(null)} aria-label="Close video" className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white"><X className="h-6 w-6"/></button>{youtubeId(open) ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(open)}?autoplay=1&playsinline=1`} title={open.title || 'YouTube video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full"/> : vimeoId(open) ? <iframe src={`https://player.vimeo.com/video/${vimeoId(open)}?autoplay=1&playsinline=1`} title={open.title || 'Vimeo video'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full"/> : <video src={open.url} poster={open.thumbnail_url || undefined} autoPlay controls playsInline className="max-h-full max-w-full"/>}<div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16"><h2 className="text-lg font-bold">{open.title || 'Untitled video'}</h2></div></div>}
  </div>;
}
