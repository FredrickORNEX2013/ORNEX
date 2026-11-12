import { useCallback, useEffect, useRef, useState } from 'react';

const SPLASH_MS = 2500;
const FADE_MS = 450;
const SPLASH_SEEN_KEY = 'ornex-splash-seen';

export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      window.localStorage.setItem(SPLASH_SEEN_KEY, 'true');
    } catch {
      // Continue normally when browser storage is unavailable.
    }
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(finish, SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <div
      aria-label="ORNEX splash screen"
      aria-hidden={leaving}
      className={`ornex-splash fixed inset-0 z-[200] isolate overflow-hidden bg-black transition-opacity duration-[450ms] ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={`${import.meta.env.BASE_URL}IMG-20261109-WA9849.jpg`}
        alt="ORNEX"
        fetchPriority="high"
        className="ornex-splash-image absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="ornex-splash-vignette absolute inset-0" />
      <div className="ornex-splash-brand" aria-hidden="true">
        <span className="ornex-splash-ring" />
        <span className="ornex-splash-wordmark">ORNEX</span>
      </div>
      <div className="ornex-splash-loader" aria-label="Loading">
        <span />
      </div>
    </div>
  );
}
