import { useEffect, useRef, useState } from 'react';
import { Play, RotateCw } from 'lucide-react';

type VideoPlayerProps = { src: string; thumbnailUrl?: string | null; isActive: boolean; shouldPreload: boolean; loop?: boolean; muted?: boolean; onEnded?: () => void; onMuteToggle?: (muted: boolean) => void };
type LoadState = 'loading' | 'ready' | 'error';

export default function VideoPlayer({ src, thumbnailUrl, isActive, shouldPreload, loop = true, muted = false, onEnded, onMuteToggle }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [playing, setPlaying] = useState(false);
  const shouldLoad = isActive || shouldPreload;

  useEffect(() => { const video = videoRef.current; if (video) video.muted = muted; }, [muted]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isActive) { video.pause(); video.currentTime = 0; return; }
    if (loadState !== 'ready') return;
    video.play().catch(() => { video.muted = true; onMuteToggle?.(true); video.play().catch(() => {}); });
  }, [isActive, loadState, muted, onMuteToggle]);

  const retry = () => { const video = videoRef.current; if (!video) return; setLoadState('loading'); video.load(); };
  const handleTap = () => { const video = videoRef.current; if (!video) return; if (loadState === 'error') { retry(); return; } if (video.paused) video.play().catch(() => {}); else video.pause(); };

  return (
    <div className="relative h-full w-full bg-black" onClick={handleTap}>
      <video ref={videoRef} src={shouldLoad ? src : undefined} poster={thumbnailUrl || undefined} loop={loop} playsInline preload={shouldLoad ? 'auto' : 'none'} onCanPlay={() => setLoadState('ready')} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setLoadState('error')} onEnded={onEnded} className="h-full w-full object-cover" />
      {shouldLoad && loadState === 'loading' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A020F0]/30 border-t-[#C084FC] shadow-[0_0_14px_rgba(160,32,240,0.4)]" /></div>}
      {isActive && loadState === 'ready' && !playing && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#A020F0]/40 bg-black/50 backdrop-blur-sm"><Play className="h-7 w-7 translate-x-0.5 text-white" fill="white" /></div></div>}
      {loadState === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60"><button onClick={(event) => { event.stopPropagation(); retry(); }} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8A2BE2] via-[#A020F0] to-[#C084FC] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(160,32,240,0.38)] active:scale-95"><RotateCw className="h-3.5 w-3.5" />Tap to retry</button></div>}
    </div>
  );
}
