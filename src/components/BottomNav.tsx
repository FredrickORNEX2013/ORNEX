import { Home, Compass, Plus, MessageCircle, User } from 'lucide-react';

export type TabKey = 'foryou' | 'explore' | 'post' | 'inbox' | 'me';

type BottomNavProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  visibleTabs?: string[];
};

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'foryou', label: 'For You', icon: Home },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'post', label: 'Post', icon: Plus },
  { key: 'inbox', label: 'Inbox', icon: MessageCircle },
  { key: 'me', label: 'Me', icon: User },
];

export default function BottomNav({ active, onChange, visibleTabs }: BottomNavProps) {
  const tabs = visibleTabs ? TABS.filter((t) => visibleTabs.includes(t.key)) : TABS;

  return (
    <nav
      aria-label="Main navigation"
      className="ornex-bottom-nav fixed bottom-0 left-0 right-0 z-[99999] flex items-center justify-around border-t border-[#A020F0]/30 bg-black bottom-nav-safe"
      style={{ height: '70px' }}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        const isPost = key === 'post';

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-current={isActive ? 'page' : undefined}
            className="ornex-nav-item flex flex-col items-center gap-0.5 active:scale-95"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${isActive ? 'ornex-nav-active' : ''} ${isPost ? 'ornex-nav-post' : ''}`}>
              <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-[#C084FC]' : 'text-white/60'}`} strokeWidth={isActive ? 2.6 : 2} />
            </span>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#C084FC]' : 'text-white/60'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
