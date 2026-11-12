import { useMemo, useState } from 'react';
import { Play, Search, X } from 'lucide-react';
import { useVideos, useProfiles } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';
import LiveStreams from '@/components/LiveStreams';

const CATEGORIES = ['All', 'Comedy', 'Drama', 'Entertainment', 'Live'] as const;
function isLong(video: VideoRecord) {
  if (video.is_live) return false;
  if (video.type) return video.type.toUpperCase() === 'LONG';
  return typeof video.duration_seconds === 'number' && video.duration_seconds > 60;
}
function isShort(video: VideoRecord) {
  if (video.is_live) return false;
  if (video.type) return video.type.toUpperCase() === 'SHORT';
  return typeof video.duration_seconds === 'number' && video.duration_seconds <= 60;
}
function rank(a: VideoRecord, b: VideoRecord) {
  return ((b.likes || 0) * 2 + (b.views || 0)) - ((a.likes || 0) * 2 + (a.views || 0));
}

export default function ExploreTab() {
  const { videos } = useVideos();
  const [active, setActive] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<VideoRecord | null>(null);
  const regular = videos.filter((video) => video.is_live !== true);
  const categories = active === 'All' ? regular : regular.filter((video) => video.category === active);
  const profiles = useProfiles(useMemo(() => categories.map((video) => video.user_id).filter(Boolean) as string[], [categories]));
  const search = query.trim().toLowerCase();
  const filtered = search ? categories.filter((video) => [video.title, video.caption, profiles[video.user_id || '']?.username, profiles[video.user_id || '']?.display_name].filter(Boolean).join(' ').toLowerCase().includes(search)) : categories;
  const ranked = [...filtered].sort(rank);
  const longs = ranked.filter(isLong);
  const shorts = ranked.filter(isShort);

  if (active === 'Live') return <div className="h-full overflow-y-auto bg-black pb-24 text-white"><div className="px-4 pt-4"><h1 className="text-2xl font-bold">Live</h1></div><CategoryPills active={active} onChange={setActive}/><LiveStreams/></div>;
  return <div className="h-full overflow-y-auto bg-black pb-24 text-white">
    <div className="px-4 pt-4"><h1 className="text-2xl font-bold">Explore</h1><label className="mt-3 flex items-center gap-2 border border-white/25 px-3 py-2"><Search className="h-4 w-4"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos" className="min-w-0 flex-1 bg-black text-sm text-white outline-none placeholder:text-white/60"/><button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X className="h-4 w-4"/></button></label></div>
    {!search && ranked[0] && <section className="px-4 pt-4"><h2 className="mb-2 text-lg font-bold">TRENDING #1</h2><button onClick={() => setOpen(ranked[0])} className="relative block w-full overflow-hidden border-2 border-[#D61E2B] text-left"><img src={ranked[0].thumbnail_url || undefined} alt="" className="aspect-video w-full bg-black object-cover"/><span className="absolute inset-x-0 bottom-0 bg-black/80 p-3 font-bold">{ranked[0].title || ranked[0].caption || 'Trending video'}</span><span className="absolute left-3 top-3 bg-[#D61E2B] px-2 py-1 text-xs font-bold">#1 TRENDING</span></button></section>}
    {!search && ranked.length > 0 && <section className="pt-4"><h2 className="px-4 text-lg font-bold">TRENDING · TOP 10</h2><div className="mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-1">{ranked.slice(0, 10).map((video, index) => <button key={video.id} onClick={() => setOpen(video)} className="w-36 shrink-0 snap-start text-left"><div className="relative aspect-video overflow-hidden bg-black"><img src={video.thumbnail_url || undefined} alt="" className="h-full w-full object-cover"/><span className="absolute left-2 top-2 bg-[#D61E2B] px-2 py-1 text-xs font-bold">#{index + 1}</span></div><p className="mt-1 truncate text-sm font-semibold">{video.title || video.caption || 'Video'}</p></button>)}</div></section>}
    <CategoryPills active={active} onChange={setActive}/>
    {filtered.length === 0 ? <p className="px-4 py-10 text-center text-sm text-white/70">No videos found.</p> : <div className="space-y-6 px-4 pb-6">
      {longs.length > 0 && <section><h2 className="mb-2 text-lg font-bold">LONG VIDEOS</h2><div className="space-y-4">{longs.map((video) => <button key={video.id} onClick={() => setOpen(video)} className="block w-full text-left"><div className="relative aspect-video overflow-hidden bg-black"><img src={video.thumbnail_url || undefined} alt="" className="h-full w-full object-cover"/><span className="absolute bottom-2 right-2 bg-black/90 px-2 py-1 text-xs">LONG</span></div><p className="mt-1 font-semibold">{video.title || video.caption || 'Untitled video'}</p><p className="text-xs text-white/60">{profiles[video.user_id || '']?.username ? `@${profiles[video.user_id || '']?.username}` : 'ORNEX'} · {video.views || 0} views</p></button>)}</div></section>}
      {shorts.length > 0 && <section><h2 className="mb-2 text-lg font-bold">SHORT VIDEOS</h2><div className="flex snap-x gap-3 overflow-x-auto pb-2">{shorts.map((video) => <button key={video.id} onClick={() => setOpen(video)} className="w-28 shrink-0 snap-start text-left"><div className="relative aspect-[9/16] overflow-hidden bg-black"><img src={video.thumbnail_url || undefined} alt="" className="h-full w-full object-cover"/><span className="absolute bottom-2 right-2 bg-[#D61E2B] px-1.5 py-1 text-[10px] font-bold">SHORT</span><Play className="absolute inset-0 m-auto h-7 w-7 fill-white text-white"/></div><p className="mt-1 truncate text-sm font-semibold">{video.title || video.caption || 'Untitled video'}</p></button>)}</div></section>}
    </div>}
    {open && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={() => setOpen(null)} aria-label="Close video" className="absolute right-4 top-4 z-10 bg-black p-2 text-white"><X/></button><video src={open.url} poster={open.thumbnail_url || undefined} controls autoPlay playsInline className="max-h-full max-w-full"/></div>}
  </div>;
}

function CategoryPills({ active, onChange }: { active: string; onChange: (category: string) => void }) {
  return <div role="tablist" aria-label="Explore categories" className="flex gap-2 overflow-x-auto px-4 py-3">{CATEGORIES.map((category) => <button key={category} role="tab" aria-selected={active === category} onClick={() => onChange(category)} className={`shrink-0 border px-4 py-2 text-sm font-semibold ${active === category ? 'border-[#D61E2B] bg-[#D61E2B] text-white' : 'border-white/30 bg-black text-white'}`}>{category}</button>)}</div>;
}
