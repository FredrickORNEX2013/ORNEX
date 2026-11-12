import { useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useVideos } from '@/lib/hooks';
import { type VideoRecord } from '@/lib/supabase';

function isShort(video: VideoRecord) {
  if (video.is_live) return false;
  if (video.type) return video.type.toUpperCase() === 'SHORT';
  return typeof video.duration_seconds === 'number' && video.duration_seconds <= 60;
}

export default function ForYouTab({ onPostClick }: { onPostClick: () => void }) {
  const { videos, loading } = useVideos();
  const shorts = useMemo(() => videos.filter(isShort), [videos]);
  const feedRef = useRef<HTMLDivElement>(null);

  return <div ref={feedRef} aria-label="For You short videos" className="h-full snap-y snap-mandatory overflow-y-auto bg-black text-white [scrollbar-width:none]">
    {shorts.length === 0 ? <section className="flex h-full snap-start flex-col items-center justify-center px-8 text-center">
      <p className="text-xl font-bold">No short videos yet</p>
      <p className="mt-2 text-sm text-white/70">The For You feed only shows videos that are 60 seconds or shorter.</p>
      <button onClick={onPostClick} className="mt-5 flex items-center gap-2 bg-[#D61E2B] px-5 py-3 font-bold"><Plus className="h-5 w-5"/>Upload a video</button>
      {loading && <p className="mt-4 text-sm text-white/60">Loading videos…</p>}
    </section> : shorts.map((video) => <ShortSlide key={video.id} video={video} onPostClick={onPostClick}/>) }
  </div>;
}

function ShortSlide({ video, onPostClick }: { video: VideoRecord; onPostClick: () => void }) {
  return <article className="relative h-full min-h-full snap-start snap-always overflow-hidden bg-black">
    <video src={video.url} poster={video.thumbnail_url || undefined} autoPlay muted loop playsInline controls className="absolute inset-0 h-full w-full object-contain" aria-label={video.title || 'Short video'} />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-5 pb-8 pt-20">
      <span className="mb-2 inline-block bg-[#D61E2B] px-2 py-1 text-xs font-bold">SHORT</span>
      <h2 className="text-lg font-bold">{video.title || 'Untitled video'}</h2>
      {video.caption && <p className="mt-1 line-clamp-3 text-sm text-white/90">{video.caption}</p>}
      {video.category && <p className="mt-2 text-xs font-semibold">{video.category}</p>}
    </div>
    <button onClick={onPostClick} aria-label="Upload a video" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#D61E2B] text-white"><Plus className="h-6 w-6"/></button>
  </article>;
}
