import { Search, Bell } from 'lucide-react';

type HeaderProps = { onSearch?: (query: string) => void; appName?: string };

export default function Header({ onSearch, appName = 'ORNEX' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#A020F0]/30 bg-black px-4 shadow-[0_4px_20px_rgba(160,32,240,0.10)]">
      <div className="flex items-center gap-2.5">
        <img src="/IMG-20261109-WA2666.jpg" alt="ORNEX logo" width={34} height={34} className="h-8 w-8 rounded-full border border-[#A020F0]/50 object-cover shadow-[0_0_12px_rgba(160,32,240,0.24)]" />
        <span className="text-lg font-extrabold tracking-tighter text-white">{appName}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-[#A020F0]/30 bg-[#111111] px-3 py-1.5 transition-colors focus-within:border-[#A020F0]">
          <Search className="h-4 w-4 shrink-0 text-[#C084FC]" />
          <input type="text" placeholder="Search" onChange={(e) => onSearch?.(e.target.value)} className="ml-2 w-28 bg-transparent text-sm text-white placeholder:text-[#C084FC]/70 focus:outline-none sm:w-40" />
        </div>
        <button aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-transparent hover:border-[#A020F0]/30 hover:bg-[#111111] active:scale-95"><Bell className="h-5 w-5 text-white" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#A020F0] shadow-[0_0_10px_rgba(160,32,240,0.8)]" /></button>
      </div>
    </header>
  );
}
