import { Home, Compass, Plus, MessageCircle, User } from 'lucide-react';

export type TabKey = 'foryou' | 'explore' | 'post' | 'inbox' | 'me';
type BottomNavProps = { active: TabKey; onChange: (tab: TabKey) => void };
const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'foryou', label: 'For You', icon: Home },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'post', label: 'Post', icon: Plus },
  { key: 'inbox', label: 'Inbox', icon: MessageCircle },
  { key: 'me', label: 'Me', icon: User },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav aria-label="Main navigation" className="ornex-bottom-nav fixed bottom-0 left-0 right-0 z-[99999] flex items-center justify-around border-t border-white/10 bg-black bottom-nav-safe px-2 py-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)} aria-current={isActive ? 'page' : undefined} className="ornex-nav-item flex flex-col items-center gap-0.5 active:scale-95">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isActive ? 'ornex-nav-active' : ''} ${key === 'post' ? 'ornex-nav-post' : ''}`}>
              <Icon className={`h-5 w-5 ${isActive ? 'text-[#D61E2B]' : 'text-white'}`} />
            </span>
            <span className={`text-[10px] font-medium ${isActive ? 'text-[#D61E2B]' : 'text-white/60'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
