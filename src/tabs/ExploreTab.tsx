import { useMemo, useState } from 'react';
import { Play, Search, X } from 'lucide-react';
import { useVideos, useProfiles } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';
import LiveStreams from '@/components/LiveStreams';

const CATEGORIES = ['All', 'Comedy', 'Drama', 'Entertainment', 'Live'] as const;

function vimeoId(value?: string | null) {
  if (!value) return null;
  return value.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/i)?.[1] || null;
}

export default function ExploreTab() {
  const { videos } = useVideos();
  const [active, setActive] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<VideoRecord | null>(null);
  const categories = active === 'Live' ? [] : videos.filter((video) => video.is_live !== true && (active === 'All' || video.category === active));
  const profiles = useProfiles(useMemo(() => categories.map((video) => video.user_id).filter(Boolean) as string[], [categories]));
  const search = query.trim().toLowerCase();
  const filtered = search ? categories.filter((video) => [video.title, video.caption, profiles[video.user_id || '']?.username, profiles[video.user_id || '']?.display_name].filter(Boolean).join(' ').toLowerCase().includes(search)) : categories;
  const sorted = [...filtered].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return <div className="h-full overflow-y-auto bg-black pb-24 text-white">
    <div className="px-4 pt-4"><h1 className="text-2xl font-bold">Explore</h1><label className="mt-3 flex items-center gap-2 border border-white/25 px-3 py-2"><Search className="h-4 w-4"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos and creators" className="w-full bg-transparent text-sm outline-none"/><button onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4"/></button></label></div>
    <CategoryPills active={active} onChange={setActive}/>
    {active === 'Live' ? <LiveStreams/> : sorted.length === 0 ? <p className="px-4 py-10 text-center text-sm text-white/70">No videos in this category.</p> : <div className="space-y-4 px-4 pb-6">{sorted.map((video) => {
      const id = vimeoId(video.vimeo_url);
      return <button key={video.id} onClick={() => setOpen(video)} className="block w-full overflow-hidden border border-white/20 text-left">
        <div className="relative aspect-video bg-black">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover"/> : id ? <div className="flex h-full items-center justify-center"><Play className="h-10 w-10"/></div> : <video src={video.url} preload="metadata" className="h-full w-full object-cover"/>}<span className="absolute bottom-2 right-2 bg-black/75 px-2 py-1 text-xs">{video.duration_seconds || 0}s</span></div>
        <div className="p-3"><p className="font-bold">{video.title || 'Untitled video'}</p><p className="mt-1 text-sm text-white/70">{video.caption || ''}</p><p className="mt-2 text-xs text-white/60">{video.category || 'Uncategorized'} · {profiles[video.user_id || '']?.display_name || video.display_name || 'ORNEX user'}</p></div>
      </button>;
    })}</div>}
    {open && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={() => setOpen(null)} aria-label="Close video" className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2"><X className="h-6 w-6"/></button>{vimeoId(open.vimeo_url) ? <iframe src={`https://player.vimeo.com/video/${vimeoId(open.vimeo_url)}?autoplay=1&muted=1&loop=1`} title={open.title || 'Vimeo video'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0"/> : <video src={open.url} poster={open.thumbnail_url || undefined} autoPlay controls playsInline className="max-h-full max-w-full"/>}</div>}
  </div>;
}

function CategoryPills({ active, onChange }: { active: string; onChange: (category: string) => void }) {
  return <div role="tablist" aria-label="Explore categories" className="flex gap-2 overflow-x-auto px-4 py-3">{CATEGORIES.map((category) => <button key={category} role="tab" aria-selected={active === category} onClick={() => onChange(category)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${active === category ? 'border-[#D61E2B] bg-[#D61E2B] text-white' : 'border-white/25 bg-black text-white/70'}`}>{category}</button>)}</div>;
}
