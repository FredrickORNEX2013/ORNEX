import { useMemo, useState } from 'react';
import { Play, Radio } from 'lucide-react';
import { useVideos, useProfiles } from '@/lib/hooks';
import type { VideoRecord } from '@/lib/supabase';
export default function LiveStreams() {
  const { videos } = useVideos();
  const live = videos.filter((v) => v.is_live === true && v.is_channel === true);
  const profiles = useProfiles(useMemo(() => live.map((v) => v.user_id).filter(Boolean) as string[], [live]));
  const [selected, setSelected] = useState<VideoRecord | null>(null);
  if (!live.length) return <p className="px-4 py-16 text-center text-white">No live channels now</p>;
  const current = selected && live.some((v) => v.id === selected.id) ? selected : live[0];
  return <div className="space-y-4 px-4 py-3 text-white">
    <button onClick={() => setSelected(current)} className="block w-full overflow-hidden border border-white/20 text-left"><div className="relative aspect-video"><img src={current.thumbnail_url || current.url} alt="" className="h-full w-full object-cover"/><span className="absolute left-3 top-3 flex items-center gap-1 bg-[#D61E2B] px-2 py-1 text-xs font-bold"><Radio className="h-3 w-3"/>LIVE</span><span className="absolute bottom-3 right-3 bg-black/80 px-2 py-1 text-xs">{current.views || 0} viewers</span></div><div className="p-3"><b>{profiles[current.user_id || '']?.display_name || 'Channel'}</b><p className="text-sm text-white/70">{current.title || current.caption}</p></div></button>
    <div className="grid grid-cols-2 gap-3">{live.map((v)=><button key={v.id} onClick={()=>setSelected(v)} className="overflow-hidden border border-white/20 text-left"><div className="relative aspect-video"><img src={v.thumbnail_url || v.url} alt="" className="h-full w-full object-cover"/><span className="absolute left-2 top-2 bg-[#D61E2B] px-2 py-1 text-[10px] font-bold">LIVE</span><span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 text-[10px]">{v.views || 0} viewers</span><Play className="absolute inset-0 m-auto"/></div><p className="truncate p-2 text-sm font-semibold">{profiles[v.user_id || '']?.display_name || 'Channel'}</p></button>)}</div>
    {selected && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={()=>setSelected(null)} className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2">✕</button><video src={selected.url} poster={selected.thumbnail_url || undefined} autoPlay controls playsInline className="max-h-full max-w-full"/></div>}
  </div>;
}
