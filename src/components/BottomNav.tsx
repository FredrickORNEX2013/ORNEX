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
      className="fixed bottom-0 left-0 right-0 z-[99999] flex items-center justify-around border-t border-[#1A1A1A] bg-[#0A0A0A] bottom-nav-safe"
      style={{ height: '70px' }}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        const isPost = key === 'post';

        if (isPost) {
          return (
            <button key={key} onClick={() => onChange(key)} className="flex flex-col items-center gap-0.5 active:scale-95">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90 ${isActive ? 'bg-[#CC0000] ornex-red-glow' : 'bg-[#1E1E1E]'}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF2D2D]' : 'text-neutral-600'}`}>{label}</span>
            </button>
          );
        }

        return (
          <button key={key} onClick={() => onChange(key)} className="flex flex-col items-center gap-0.5 active:scale-95">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isActive ? 'ornex-red-glow' : ''}`}>
              <Icon
                className={`h-5 w-5 transition-colors ${isActive ? 'text-[#FF2D2D]' : 'text-neutral-600'}`}
                strokeWidth={isActive ? 2.6 : 2}
              />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#FF2D2D]' : 'text-neutral-600'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
