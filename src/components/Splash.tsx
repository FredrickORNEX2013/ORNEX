import { useCallback, useEffect, useRef, useState } from 'react';

const SPLASH_MS = 2500;
const FADE_MS = 300;

export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
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
      aria-label="ORNEX splash screen"
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-300 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src="/icon.svg"
        alt="ORNEX"
        width={512}
        height={512}
        className="h-[min(82vw,82vh)] w-[min(82vw,82vh)] object-contain"
      />
    </div>
  );
}
