import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { supabase, type AdRecord } from '@/lib/supabase';

type AdCardProps = {
  ad: AdRecord;
  onSkip: () => void;
};

export default function AdCard({ ad, onSkip }: AdCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [remaining, setRemaining] = useState(ad.skip_after_seconds);
  const [canSkip, setCanSkip] = useState(false);
  const skippedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Sound always on
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {
      // Autoplay with sound might be blocked — try muted then unmute
      v.muted = true;
      v.play().then(() => {
        v.muted = false;
        v.volume = 1;
      }).catch(() => {});
    });

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const trackEvent = async (eventType: 'impression' | 'click' | 'skip') => {
    if (skippedRef.current && eventType !== 'skip') return;
    await supabase.from('ad_analytics').insert({ ad_id: ad.id, event_type: eventType });
  };

  useEffect(() => {
    trackEvent('impression');
    supabase.from('ads').update({ impressions: ad.impressions + 1 }).eq('id', ad.id);
  }, []);

  const handleSkip = () => {
    if (!canSkip) return;
    skippedRef.current = true;
    trackEvent('skip');
    onSkip();
  };

  const handleLearnMore = () => {
    trackEvent('click');
    supabase.from('ads').update({ clicks: ad.clicks + 1 }).eq('id', ad.id);
    if (ad.learn_more_url) {
      window.open(ad.learn_more_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem-3.5rem)] snap-start bg-black">
      <video
        ref={videoRef}
        src={ad.video_url}
        autoPlay
        muted={false}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />

      <div className="absolute top-4 left-3 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 backdrop-blur-sm">
          <span className="text-xs font-bold text-white">Sponsored</span>
        </div>
        <span className="rounded-md bg-black px-2 py-0.5 text-xs font-bold text-white">
          {ad.brand_name}
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-6 left-3 right-3 z-20 flex items-center justify-between">
        <div className="pointer-events-auto">
          <p className="text-sm font-bold text-white">{ad.brand_name}</p>
          <p className="text-xs text-white/70">Sponsored content</p>
        </div>
        <button
          onClick={handleLearnMore}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-neutral-200 active:scale-95"
        >
          Learn More
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={handleSkip}
        disabled={!canSkip}
        className={`absolute bottom-24 right-3 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          canSkip
            ? 'bg-white/20 text-white backdrop-blur-md hover:bg-white/30 active:scale-95'
            : 'cursor-not-allowed bg-black/40 text-white/60'
        }`}
      >
        {canSkip ? (
          <>
            Skip ad
            <X className="h-3.5 w-3.5" />
          </>
        ) : (
          `Skip in ${remaining}s`
        )}
      </button>
    </div>
  );
}
