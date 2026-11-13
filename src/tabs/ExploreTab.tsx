import { useMemo, useState } from 'react';
import { Play, Search, X } from 'lucide-react';
import { useProfiles, useVideos } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';

const BASE_CATEGORIES = ['All', 'Comedy', 'Drama', 'Entertainment'] as const;

function vimeoId(video: VideoRecord) {
  const value = video.vimeo_url || video.url;
  return value?.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/i)?.[1] || null;
}
function youtubeId(video: VideoRecord) {
  const value = video.youtube_url || video.url;
  return value?.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)?.[1] || null;
}
function videoHref(video: VideoRecord) {
  return video.vimeo_url || video.youtube_url || video.url;
}

export default function ExploreTab() {
  const { videos, loading, error } = useVideos();
  const [active, setActive] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<VideoRecord | null>(null);
  const categoryOptions = useMemo(() => [...BASE_CATEGORIES, ...new Set(videos.map((video) => video.category).filter((value): value is string => !!value && !BASE_CATEGORIES.includes(value as typeof BASE_CATEGORIES[number])))], [videos]);
  const categories = videos.filter((video) => video.is_live !== true && (active === 'All' || video.category === active));
  const profiles = useProfiles(useMemo(() => categories.map((video) => video.user_id).filter(Boolean) as string[], [categories]));
  const search = query.trim().toLowerCase();
  const filtered = search ? categories.filter((video) => [video.title, video.caption, video.category, profiles[video.user_id || '']?.username, profiles[video.user_id || '']?.display_name].filter(Boolean).join(' ').toLowerCase().includes(search)) : categories;
  const sorted = [...filtered].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return <div className="h-full overflow-y-auto bg-black pb-24 text-white">
    <div className="px-4 pt-4"><h1 className="text-2xl font-bold">Explore</h1><label className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 px-3 py-2"><Search className="h-4 w-4 shrink-0"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos, creators, categories" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label></div>
    <div role="tablist" aria-label="Explore categories" className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">{categoryOptions.map((category) => <button key={category} role="tab" aria-selected={active === category} onClick={() => setActive(category)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${active === category ? 'bg-[#D61E2B] text-white' : 'bg-white/10 text-white/70'}`}>{category}</button>)}</div>
    {loading && !videos.length ? <p className="px-4 py-10 text-center text-sm text-white/60">Loading videos…</p> : error ? <p role="alert" className="px-4 py-10 text-center text-sm text-red-400">Could not load videos: {error}</p> : sorted.length === 0 ? <p className="px-4 py-10 text-center text-sm text-white/70">No videos found.</p> : <div className="grid grid-cols-2 gap-2 px-2 pb-6">{sorted.map((video) => {
      const ytId = youtubeId(video);
      const vmId = vimeoId(video);
      return <button key={video.id} onClick={() => setOpen(video)} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-neutral-900 text-left">
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : ytId ? <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : vmId ? <div className="absolute inset-0 flex items-center justify-center bg-neutral-800"><Play className="h-9 w-9"/></div> : video.url ? <video src={video.url} muted preload="metadata" className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 bg-neutral-800"/>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10"/><Play className="absolute right-2 top-2 h-5 w-5 fill-white drop-shadow"/><div className="absolute inset-x-0 bottom-0 p-3"><p className="line-clamp-2 text-sm font-bold">{video.title || 'Untitled video'}</p><p className="mt-1 truncate text-xs text-white/70">{profiles[video.user_id || '']?.username ? `@${profiles[video.user_id || '']?.username}` : video.category || 'Video'}</p></div>
      </button>;
    })}</div>}
    {open && <div role="dialog" aria-modal="true" aria-label={open.title || 'Video player'} className="fixed inset-0 z-[99999] flex items-center justify-center bg-black">
      <button onClick={() => setOpen(null)} aria-label="Close video" className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white"><X className="h-6 w-6"/></button>
      {youtubeId(open) ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(open)}?autoplay=1&playsinline=1`} title={open.title || 'YouTube video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-full max-h-[100dvh] w-full max-w-[min(100vw,56.25dvh)] border-0"/> : vimeoId(open) ? <iframe src={`https://player.vimeo.com/video/${vimeoId(open)}?autoplay=1&playsinline=1`} title={open.title || 'Vimeo video'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full max-h-[100dvh] w-full max-w-[min(100vw,56.25dvh)] border-0"/> : <video src={videoHref(open)} poster={open.thumbnail_url || undefined} controls autoPlay playsInline className="h-full max-h-[100dvh] w-full max-w-[min(100vw,56.25dvh)] object-contain"/>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16"><h2 className="text-lg font-bold">{open.title || 'Untitled video'}</h2><p className="mt-1 text-sm text-white/75">{open.caption}</p></div>
    </div>}
  </div>;
}
