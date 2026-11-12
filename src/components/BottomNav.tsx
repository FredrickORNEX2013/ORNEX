import { Home, Compass, Plus, MessageCircle, User, Radio } from 'lucide-react';

export type TabKey = 'foryou' | 'explore' | 'post' | 'live' | 'inbox' | 'me';
type BottomNavProps = { active: TabKey; onChange: (tab: TabKey) => void; visibleTabs?: string[] };
const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'foryou', label: 'For You', icon: Home },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'post', label: 'Post', icon: Plus },
  { key: 'live', label: 'Live', icon: Radio },
  { key: 'inbox', label: 'Inbox', icon: MessageCircle },
  { key: 'me', label: 'Me', icon: User },
];

export default function BottomNav({ active, onChange, visibleTabs }: BottomNavProps) {
  const tabs = visibleTabs ? TABS.filter((tab) => visibleTabs.includes(tab.key) || tab.key === 'live') : TABS;
  return <nav aria-label="Main navigation" className="ornex-bottom-nav fixed bottom-0 left-0 right-0 z-[99999] flex items-center justify-around border-t border-white/10 bg-black bottom-nav-safe px-1 py-2">
    {tabs.map(({ key, label, icon: Icon }) => {
      const isActive = active === key;
      return <button key={key} onClick={() => onChange(key)} aria-current={isActive ? 'page' : undefined} className="ornex-nav-item flex flex-col items-center gap-0.5 active:scale-95">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${isActive ? 'ornex-nav-active' : ''} ${key === 'post' ? 'ornex-nav-post' : ''}`}><Icon className={`h-5 w-5 ${key === 'live' ? 'text-[#D61E2B]' : isActive ? 'text-[#D61E2B]' : 'text-white/70'}`} strokeWidth={isActive ? 2.5 : 2}/></span>
        <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#D61E2B]' : 'text-white/60'}`}>{label}</span>
      </button>;
    })}
  </nav>;
}
