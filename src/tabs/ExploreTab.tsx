import { useMemo, useState } from 'react';
import { Play, Search, X } from 'lucide-react';
import { useVideos } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';
const CATEGORIES=['All','Comedy','Drama','Entertainment','Live'];
export default function ExploreTab(){
 const {videos}=useVideos();const [active,setActive]=useState('All');const [query,setQuery]=useState('');const [open,setOpen]=useState<VideoRecord|null>(null);
 const filtered=useMemo(()=>videos.filter(v=>active==='All'||v.category?.toLowerCase()===active.toLowerCase()).filter(v=>!query||`${v.title||''} ${v.caption||''} ${v.category||''}`.toLowerCase().includes(query.toLowerCase())),[videos,active,query]);
 return <div className="h-full overflow-y-auto bg-black pb-24 text-white"><div className="px-4 pt-4"><h1 className="text-2xl font-bold">Explore</h1><label className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 px-3 py-2"><Search className="h-4 w-4"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search videos" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label></div>
 <div role="tablist" className="flex gap-2 overflow-x-auto px-4 py-3">{CATEGORIES.map(c=><button key={c} onClick={()=>setActive(c)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${active===c?'bg-[#D61E2B]':'bg-white/10'}`}>{c}</button>)}</div>
 <div className="flex gap-2 overflow-x-auto px-4 pb-3">{['All Channels','Comedy','Drama','Entertainment','Live'].map(c=><button key={c} onClick={()=>setActive(c==='All Channels'?'All':c)} className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-xs">{c}</button>)}</div>
 <div className="grid grid-cols-2 gap-1 px-1">{filtered.map(v=><button key={v.id} onClick={()=>setOpen(v)} className="relative aspect-[9/16] overflow-hidden bg-neutral-900 text-left">{v.thumbnail_url?<img src={v.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover"/>:<video src={v.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover"/>}<span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black p-3 text-sm font-bold">{v.title||v.category||'Video'}</span><Play className="absolute right-2 top-2" size={18}/></button>)}</div>
 {open&&<div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={()=>setOpen(null)} className="absolute right-4 top-4 z-10"><X/></button><video src={open.url} poster={open.thumbnail_url||undefined} controls autoPlay playsInline className="h-full max-h-[85dvh] w-full object-contain"/>}</div>}</div>;
}
