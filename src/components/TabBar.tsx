type TabBarProps = {
  tabs: readonly string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'pill' | 'underline';
};

export default function TabBar({ tabs, activeTab, onTabChange, variant = 'pill' }: TabBarProps) {
  if (variant === 'underline') {
    return (
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-neutral-200 bg-white px-4 py-2.5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative whitespace-nowrap text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-black' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 rounded-full bg-black" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-4 py-2.5 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
            activeTab === tab
              ? 'bg-black text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
