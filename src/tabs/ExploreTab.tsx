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
        const haystack = [v.title, v.caption, profile?.username, profile?.display_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : categoryVideos;

  if (activeCategory === 'Live') {
    return (
      <div className="min-h-[calc(100dvh-3.5rem-70px)] overflow-y-auto scrollbar-hide bg-[#0A0A0A]">
        <CategoryPills active={activeCategory} onChange={setActiveCategory} />
        <LiveStreams />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem-70px)] overflow-y-auto scrollbar-hide bg-[#0A0A0A]">
      <div className="ornex-red-nebula px-4 pt-5 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Explore</h1>
        <p className="mt-0.5 text-sm text-neutral-400">Discover stories</p>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center rounded-full border border-[#1E1E1E] bg-[#1A1A1A] px-3 py-2.5 focus-within:border-[#FF2D2D]">
          <Search className="h-4 w-4 shrink-0 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos or creators"
            className="ml-2 flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/10" aria-label="Clear search">
              <X className="h-3 w-3 text-white" />
            </button>
          )}
        </div>
      </div>

      <CategoryPills active={activeCategory} onChange={setActiveCategory} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Play className="mb-3 h-12 w-12 text-neutral-700" />
          <p className="text-sm font-bold text-white">{q ? 'No matches' : 'No videos in this category'}</p>
          <p className="mt-1 text-xs text-neutral-500">{q ? 'Try a different search term' : 'Check back soon'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-6">
          {filtered.map((v) => (
            <button
              key={v.id}
              onClick={() => setOpenVideo(v)}
              className="relative aspect-[9/16] overflow-hidden bg-[#1A1A1A] active:scale-95 transition-transform"
            >
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Play className="h-5 w-5 text-[#FF2D2D]/50" fill="currentColor" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6 text-left">
                <p className="text-[10px] font-semibold text-white">{formatViews(v.views)} views</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {openVideo && <FullscreenPlayer video={openVideo} onClose={() => setOpenVideo(null)} />}
    </div>
  );
}

function FullscreenPlayer({ video, onClose }: { video: VideoRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black">
      <button
        onClick={onClose}
        aria-label="Close video"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md active:scale-90"
      >
        <X className="h-5 w-5 text-white" />
      </button>
      <video
        src={video.url}
        poster={video.thumbnail_url || undefined}
        autoPlay
        controls
        playsInline
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function CategoryPills({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            active === c
              ? 'bg-[#FF2D2D] text-white ornex-red-glow'
              : 'border border-[#FF2D2D]/30 bg-[#1A1A1A] text-white hover:border-[#FF2D2D]/60'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
