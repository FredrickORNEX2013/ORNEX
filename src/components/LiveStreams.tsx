import { useState } from 'react';
import { Radio, Play } from 'lucide-react';

type LiveStream = {
  id: string;
  title: string;
  channel: string;
  embedId: string;
};

const LIVE_STREAMS: LiveStream[] = [
  { id: '1', title: 'France 24 English Live', channel: 'France 24', embedId: 'c7d3I1-_1iY' },
  { id: '2', title: 'Al Jazeera English Live', channel: 'Al Jazeera English', embedId: 'gCNeDWCI0vo' },
  { id: '3', title: 'DW News Live', channel: 'DW News', embedId: 'NQHy6A0WUIk' },
  { id: '4', title: 'NASA TV Live', channel: 'NASA', embedId: '21X5lGlDOfg' },
];

export default function LiveStreams() {
  const [activeStream, setActiveStream] = useState<LiveStream>(LIVE_STREAMS[0]);

  return (
    <div className="px-4 py-4">
      {/* Main player */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-black">
        <div className="relative aspect-video w-full">
          <iframe
            key={activeStream.id}
            src={`https://www.youtube.com/embed/${activeStream.embedId}?autoplay=1&mute=1`}
            title={activeStream.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Active stream info */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
          <Radio className="h-3 w-3 animate-pulse" />
          LIVE
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-black">{activeStream.title}</h3>
          <p className="text-xs text-neutral-500">{activeStream.channel}</p>
        </div>
      </div>

      {/* Stream selector */}
      <h4 className="mb-2 mt-5 text-sm font-semibold text-black">More live channels</h4>
      <div className="grid grid-cols-2 gap-3">
        {LIVE_STREAMS.map((stream) => {
          const isActive = stream.id === activeStream.id;
          return (
            <button
              key={stream.id}
              onClick={() => setActiveStream(stream)}
              className={`overflow-hidden rounded-xl border text-left transition-all active:scale-95 ${
                isActive ? 'border-black ring-1 ring-black' : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <div className="relative aspect-video w-full bg-neutral-100">
                <img
                  src={`https://img.youtube.com/vi/${stream.embedId}/mqdefault.jpg`}
                  alt={stream.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                    <Play className="h-5 w-5 translate-x-0.5 text-white" fill="white" />
                  </div>
                </div>
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  <Radio className="h-2.5 w-2.5" />
                  LIVE
                </span>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-semibold text-black">{stream.title}</p>
                <p className="truncate text-[11px] text-neutral-500">{stream.channel}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
