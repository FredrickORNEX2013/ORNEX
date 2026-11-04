import { useCallback, useEffect, useRef, useState } from 'react';

const SPLASH_MS = 1000;
const FADE_MS = 300;

export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(finish, SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
      onClick={finish}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') finish(); }}
      className={`fixed inset-0 z-[200] flex cursor-pointer items-center justify-center bg-[#000000] transition-opacity duration-300 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {logoFailed ? (
        <span className="text-5xl font-extrabold tracking-tighter text-white">ORNEX</span>
      ) : (
        <img
          src="/ornex-logo.png"
          alt="ORNEX"
          width={200}
          height={200}
          onError={() => setLogoFailed(true)}
          className="h-[200px] w-[200px] animate-pulse object-contain"
          style={{ filter: 'drop-shadow(0 0 28px rgba(168, 85, 247, 0.75))' }}
        />
      )}
    </div>
  );
}
