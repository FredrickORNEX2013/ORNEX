import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import BottomNav, { type TabKey } from '@/components/BottomNav';
import ForYouTab from '@/tabs/ForYouTab';
import ExploreTab from '@/tabs/ExploreTab';
import PostTab from '@/tabs/PostTab';
import InboxTab from '@/tabs/InboxTab';
import MeTab from '@/tabs/MeTab';
import AdminPanel from '@/components/AdminPanel';
import Splash from '@/components/Splash';
import { useAppConfig } from '@/lib/appConfig';

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function useBoltKill() {
  useEffect(() => {
    const kill = () => {
      document.querySelectorAll('[class*="bolt"], [id*="bolt"], [class*="Bolt"], [id*="Bolt"]').forEach((element) => {
        (element as HTMLElement).style.display = 'none';
      });
      document.querySelectorAll('a, span, div, p, button').forEach((element) => {
        const text = element.textContent || '';
        if ((text.includes('Made in Bolt') || text.includes('Bolt.new') || text.includes('Powered by Bolt')) && element.children.length === 0) {
          (element as HTMLElement).style.display = 'none';
        }
      });
    };
    kill();
    const observer = new MutationObserver(kill);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(kill, 500);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);
}

export default function App() {
  const hash = useHashRoute();
  const config = useAppConfig();
  const [activeTab, setActiveTab] = useState<TabKey>('foryou');
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return window.localStorage.getItem('ornex-splash-seen') !== 'true';
    } catch {
      return true;
    }
  });
  const [loading, setLoading] = useState(true);
  const finishSplash = useCallback(() => {
    setLoading(false);
    setShowSplash(false);
  }, []);

  useBoltKill();

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setLoading(false);
      setShowSplash(false);
    }, 2500);
    return () => window.clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (config.showTabs?.length && !config.showTabs.includes(activeTab)) {
      setActiveTab(config.showTabs[0] as TabKey);
    }
  }, [config.showTabs, activeTab]);

  if (hash === '#/admin' || hash === '#admin') return <AdminPanel />;

  const renderTab = () => {
    switch (activeTab) {
      case 'foryou': return <ForYouTab onPostClick={() => setActiveTab('post')} />;
      case 'explore': return <ExploreTab />;
      case 'post': return <PostTab />;
      case 'inbox': return <InboxTab />;
      case 'me': return <MeTab />;
      default: return <ForYouTab onPostClick={() => setActiveTab('post')} />;
    }
  };

  const isForYou = activeTab === 'foryou';
  return (
    <div aria-busy={loading} className="flex h-[100dvh] flex-col bg-black text-white">
      {!isForYou && <Header appName={config.appName} />}
      <main className="min-h-0 flex-1 overflow-hidden bg-black">
        <div key={activeTab} className="h-full w-full transition-none">
          {renderTab()}
        </div>
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} visibleTabs={config.showTabs} />
      {showSplash && <Splash onDone={finishSplash} />}
    </div>
  );
}
