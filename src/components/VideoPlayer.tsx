import { useEffect, useRef, useState } from 'react';
import { Play, RotateCw } from 'lucide-react';

type VideoPlayerProps = { src: string; vimeoUrl?: string | null; thumbnailUrl?: string | null; isActive: boolean; shouldPreload: boolean; loop?: boolean; muted?: boolean; onEnded?: () => void; onMuteToggle?: (muted: boolean) => void };
type LoadState = 'loading' | 'ready' | 'error';

function getVimeoId(value?: string | null) {
  if (!value) return null;
  return value.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/i)?.[1] || null;
}

export default function VideoPlayer({ src, vimeoUrl, thumbnailUrl, isActive, shouldPreload, loop = true, muted = false, onEnded, onMuteToggle }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [playing, setPlaying] = useState(false);
  const shouldLoad = isActive || shouldPreload;
  const embedId = getVimeoId(vimeoUrl) || getVimeoId(src);

  useEffect(() => { const video = videoRef.current; if (video) video.muted = muted; }, [muted]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || embedId) return;
    if (!isActive) { video.pause(); video.currentTime = 0; return; }
    if (loadState !== 'ready') return;
    video.play().catch(() => { video.muted = true; onMuteToggle?.(true); video.play().catch(() => {}); });
  }, [embedId, isActive, loadState, muted, onMuteToggle]);

  const retry = () => { const video = videoRef.current; if (!video) return; setLoadState('loading'); video.load(); };
  const handleTap = () => { const video = videoRef.current; if (!video) return; if (loadState === 'error') { retry(); return; } if (video.paused) video.play().catch(() => {}); else video.pause(); };

  if (embedId) {
    return <div className="relative h-full w-full bg-black">{shouldLoad ? <iframe key={`${embedId}-${isActive}`} src={`https://player.vimeo.com/video/${embedId}?autoplay=${isActive ? '1' : '0'}&muted=1&loop=1`} title="Vimeo video" className="h-full w-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy"/> : thumbnailUrl ? <img src={thumbnailUrl} alt="" className="h-full w-full object-cover"/> : null}</div>;
  }

  return <div className="relative h-full w-full bg-black" onClick={handleTap}>
    <video ref={videoRef} src={shouldLoad ? src : undefined} poster={thumbnailUrl || undefined} loop={loop} playsInline preload={shouldLoad ? 'auto' : 'none'} onCanPlay={() => setLoadState('ready')} onError={() => setLoadState('error')} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={onEnded} className="h-full w-full object-cover"/>
    {shouldLoad && loadState === 'loading' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"/></div>}
    {isActive && loadState === 'ready' && !playing && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50"><Play className="h-8 w-8 fill-white text-white"/></div></div>}
    {loadState === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60"><button onClick={(event) => { event.stopPropagation(); retry(); }} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><RotateCw className="h-4 w-4"/>Retry</button></div>}
  </div>;
}
