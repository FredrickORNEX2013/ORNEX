import { useMemo, useState } from 'react';
import { Play, Search, X, Heart } from 'lucide-react';
import { useVideos, useProfiles } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';
import { formatViews } from '@/lib/format';
import LiveStreams from '@/components/LiveStreams';
const CATEGORIES = ['All', 'Comedy', 'Drama', 'Entertainment', 'Live'] as const;
export default function ExploreTab() {
  const { videos } = useVideos();
  const [active, setActive] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<VideoRecord | null>(null);
  const regular = videos.filter((v) => v.is_live !== true);
  const categories = active === 'All' ? regular : regular.filter((v) => v.category === active);
  const profiles = useProfiles(useMemo(() => categories.map((v) => v.user_id).filter(Boolean) as string[], [categories]));
  const q = query.trim().toLowerCase();
  const filtered = q ? categories.filter((v) => [v.title, v.caption, profiles[v.user_id || '']?.username, profiles[v.user_id || '']?.display_name].filter(Boolean).join(' ').toLowerCase().includes(q)) : categories;
  const ranked = [...filtered].sort((a, b) => (b.likes || 0) - (a.likes || 0));
  const banner = ranked[0];
  const longs = ranked.filter((v) => v.type === 'LONG' || (v.type == null && (v.duration_seconds || 0) > 60));
  const shorts = ranked.filter((v) => v.type === 'SHORT' || (v.type == null && (v.duration_seconds || 0) <= 60));
  if (active === 'Live') return <div className="h-full overflow-y-auto bg-black text-white"><CategoryPills active={active} onChange={setActive}/><LiveStreams/></div>;
  return <div className="h-full overflow-y-auto bg-black pb-24 text-white">
    <div className="px-4 pt-4"><h1 className="text-2xl font-bold">Explore</h1><div className="mt-3 flex items-center border border-white/25 px-3 py-2"><Search className="h-4 w-4"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search videos or creators" className="ml-2 flex-1 bg-transparent text-sm outline-none"/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X className="h-4 w-4"/></button>}</div></div>
    {!q && banner && <section className="px-4 pt-4"><h2 className="mb-2 text-lg font-bold">TRENDING #1</h2><button onClick={() => setOpen(banner)} className="relative block w-full overflow-hidden border-4 border-[#D61E2B] text-left"><video src={banner.url} poster={banner.thumbnail_url || undefined} autoPlay muted loop playsInline className="aspect-video w-full object-cover"/><span className="absolute inset-x-0 bottom-0 bg-black/70 p-3 font-bold">{banner.title || banner.caption || 'Trending video'}</span></button></section>}
    {!q && <section className="pt-4"><h2 className="px-4 text-lg font-bold">TRENDING</h2><div className="mt-2 flex snap-x gap-3 overflow-x-auto px-4">{ranked.slice(0,10).map((v,i)=><button key={v.id} onClick={()=>setOpen(v)} className="w-36 shrink-0 snap-start text-left"><div className="relative aspect-video bg-white/10"><img src={v.thumbnail_url || v.url} alt="" className="h-full w-full object-cover"/><span className="absolute left-1 top-1 bg-[#D61E2B] px-1 text-xs">#{i+1}</span></div><p className="mt-1 truncate text-sm">{v.title || v.caption}</p><span className="flex items-center gap-1 text-xs text-white/70"><Heart className="h-3 w-3"/>{formatViews(v.likes || 0)}</span></button>)}</div></section>}
    <CategoryPills active={active} onChange={setActive}/>
    {filtered.length === 0 ? <p className="px-4 py-10 text-center text-sm text-white/70">No videos found.</p> : <div className="space-y-5 px-4 pb-6">{longs.length > 0 && <section><h2 className="mb-2 text-lg font-bold">LONG VIDEOS</h2><div className="space-y-3">{longs.map((v)=><button key={v.id} onClick={()=>setOpen(v)} className="block w-full text-left"><div className="relative aspect-video overflow-hidden bg-white/10"><img src={v.thumbnail_url || v.url} alt="" className="h-full w-full object-cover"/><span className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-xs">LONG</span></div><p className="mt-1 font-semibold">{v.title || v.caption}</p><p className="text-xs text-white/60">{profiles[v.user_id || '']?.username ? `@${profiles[v.user_id || ''].username}` : ''}</p></button>)}</div></section>}{shorts.length > 0 && <section><h2 className="mb-2 text-lg font-bold">SHORTS</h2><div className="flex gap-3 overflow-x-auto">{shorts.map((v)=><button key={v.id} onClick={()=>setOpen(v)} className="w-28 shrink-0 text-left"><div className="aspect-[9/16] overflow-hidden bg-white/10"><img src={v.thumbnail_url || v.url} alt="" className="h-full w-full object-cover"/></div><p className="mt-1 truncate text-xs">{v.title || v.caption}</p></button>)}</div></section>}</div>}
    {open && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={()=>setOpen(null)} aria-label="Close" className="absolute right-4 top-4 z-10"><X/></button><video src={open.url} poster={open.thumbnail_url || undefined} controls autoPlay playsInline className="max-h-full max-w-full"/>}</div>}
  </div>;
}
function CategoryPills({active,onChange}:{active:string;onChange:(c:string)=>void}) { return <div className="flex gap-2 overflow-x-auto px-4 py-3">{CATEGORIES.map(c=><button key={c} onClick={()=>onChange(c)} className={`shrink-0 border px-4 py-1.5 text-sm ${active===c?'border-[#D61E2B] bg-[#D61E2B]':'border-white/30 bg-black'}`}>{c}</button>)}</div>; }
