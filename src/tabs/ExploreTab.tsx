import { useMemo, useState } from 'react';
import { Play, Search, X } from 'lucide-react';
import { useVideos, useProfiles } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';
import { formatViews } from '@/lib/format';
import LiveStreams from '@/components/LiveStreams';

const CATEGORIES = ['All', 'Comedy', 'Drama', 'Entertainment', 'Live'] as const;

export default function ExploreTab() {
  const { videos } = useVideos();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [openVideo, setOpenVideo] = useState<VideoRecord | null>(null);

  const categoryVideos = activeCategory === 'All' ? videos : videos.filter((v) => v.category === activeCategory);
  const userIds = useMemo(() => categoryVideos.map((v) => v.user_id).filter(Boolean) as string[], [categoryVideos]);
  const profiles = useProfiles(userIds);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? categoryVideos.filter((v) => {
        const profile = v.user_id ? profiles[v.user_id] : undefined;
        return [v.title, v.caption, profile?.username, profile?.display_name].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
    : categoryVideos;

  if (activeCategory === 'Live') {
    return <div className="min-h-[calc(100dvh-3.5rem-70px)] overflow-y-auto bg-black text-white"><CategoryPills active={activeCategory} onChange={setActiveCategory} /><LiveStreams /></div>;
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem-70px)] overflow-y-auto bg-black text-white">
      <div className="ornex-purple-nebula px-4 pb-4 pt-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Explore</h1>
        <p className="mt-0.5 text-sm text-[#C084FC]">Discover stories</p>
      </div>
      <div className="px-4 pt-3">
        <div className="flex items-center rounded-full border border-[#A020F0]/30 bg-[#111111] px-3 py-2.5 focus-within:border-[#A020F0]">
          <Search className="h-4 w-4 shrink-0 text-[#C084FC]" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search videos or creators" className="ml-2 flex-1 bg-transparent text-sm text-white placeholder:text-[#C084FC]/70 focus:outline-none" />
          {query && <button onClick={() => setQuery('')} className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#8A2BE2]/30" aria-label="Clear search"><X className="h-3 w-3 text-white" /></button>}
        </div>
      </div>
      <CategoryPills active={activeCategory} onChange={setActiveCategory} />
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center"><Play className="mb-3 h-12 w-12 text-[#C084FC]" /><p className="text-sm font-bold text-white">{q ? 'No matches' : 'No videos in this category'}</p><p className="mt-1 text-xs text-[#C084FC]">{q ? 'Try a different search term' : 'Check back soon'}</p></div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1 pb-6">{filtered.map((v) => <button key={v.id} onClick={() => setOpenVideo(v)} className="relative aspect-[9/16] overflow-hidden rounded-lg border border-[#A020F0]/20 bg-[#111111] transition-transform active:scale-95">{v.thumbnail_url ? <img src={v.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Play className="h-5 w-5 text-[#C084FC]" fill="currentColor" /></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6 text-left"><p className="text-[10px] font-semibold text-white">{formatViews(v.views)} views</p></div></button>)}</div>
      )}
      {openVideo && <FullscreenPlayer video={openVideo} onClose={() => setOpenVideo(null)} />}
    </div>
  );
}

function FullscreenPlayer({ video, onClose }: { video: VideoRecord; onClose: () => void }) {
  return <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"><button onClick={onClose} aria-label="Close video" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#A020F0]/40 bg-black/70 active:scale-90"><X className="h-5 w-5 text-white" /></button><video src={video.url} poster={video.thumbnail_url || undefined} autoPlay controls playsInline className="h-full w-full object-contain" /></div>;
}

function CategoryPills({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return <div className="flex gap-2 overflow-x-auto px-4 py-3">{CATEGORIES.map((category) => <button key={category} onClick={() => onChange(category)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${active === category ? 'bg-[#A020F0] text-white shadow-[0_0_18px_rgba(160,32,240,0.38)]' : 'border border-[#A020F0]/40 bg-[#111111] text-[#C084FC] hover:border-[#8A2BE2]'}`}>{category}</button>)}</div>;
}
