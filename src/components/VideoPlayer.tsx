import { useEffect, useRef, useState } from 'react';
import { Play, RotateCw } from 'lucide-react';

type VideoPlayerProps = {
  src: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
  shouldPreload: boolean;
  loop?: boolean;
  muted?: boolean;
  onEnded?: () => void;
  onMuteToggle?: (muted: boolean) => void;
};

type LoadState = 'loading' | 'ready' | 'error';

export default function VideoPlayer({
  src,
  thumbnailUrl,
  isActive,
  shouldPreload,
  loop = true,
  muted = false,
  onEnded,
  onMuteToggle,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [playing, setPlaying] = useState(false);
  const shouldLoad = isActive || shouldPreload;

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!isActive) {
      v.pause();
      v.currentTime = 0;
      return;
    }
    if (loadState !== 'ready') return;
    v.play().catch(() => {
      v.muted = true;
      onMuteToggle?.(true);
      v.play().catch(() => {});
    });
  }, [isActive, loadState, muted]);

  const retry = () => {
    const v = videoRef.current;
    if (!v) return;
    setLoadState('loading');
    v.load();
  };

  const handleTap = () => {
    const v = videoRef.current;
    if (!v) return;
    if (loadState === 'error') {
      retry();
      return;
    }
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div className="relative h-full w-full bg-[#0A0A0A]" onClick={handleTap}>
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={thumbnailUrl || undefined}
        loop={loop}
        playsInline
        preload={shouldLoad ? 'auto' : 'none'}
        onCanPlay={() => setLoadState('ready')}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setLoadState('error')}
        onEnded={onEnded}
        className="h-full w-full object-cover"
      />

      {shouldLoad && loadState === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF2D2D]/30 border-t-[#FF2D2D]" />
        </div>
      )}

      {isActive && loadState === 'ready' && !playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <Play className="h-7 w-7 translate-x-0.5 text-white" fill="white" />
          </div>
        </div>
      )}

      {loadState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
          <button
            onClick={(e) => { e.stopPropagation(); retry(); }}
            className="flex items-center gap-1.5 rounded-full bg-[#FF2D2D] px-4 py-2 text-xs font-semibold text-white ornex-red-glow active:scale-95"
          >
            <RotateCw className="h-3.5 w-3.5" /> Tap to retry
          </button>
        </div>
      )}
    </div>
  );
}
