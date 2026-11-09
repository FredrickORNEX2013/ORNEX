type TabBarProps = {
  tabs: readonly string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'pill' | 'underline';
};

export default function TabBar({ tabs, activeTab, onTabChange, variant = 'pill' }: TabBarProps) {
  if (variant === 'underline') {
    return (
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-[#A020F0]/30 bg-black px-4 py-2.5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative whitespace-nowrap text-sm font-medium transition-colors ${activeTab === tab ? 'text-[#C084FC]' : 'text-white/70 hover:text-white'}`}
          >
            {tab}
            {activeTab === tab && <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 rounded-full bg-[#A020F0] ornex-purple-glow" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto border-b border-[#A020F0]/30 bg-black px-4 py-2.5 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${activeTab === tab ? 'bg-[#A020F0] text-white ornex-purple-glow' : 'border border-[#A020F0]/40 bg-[#111111] text-[#C084FC] hover:border-[#8A2BE2]'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
