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
      document.querySelectorAll('[class*="bolt"], [id*="bolt"], [class*="Bolt"], [id*="Bolt"]').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
      document.querySelectorAll('a, span, div, p, button').forEach((el) => {
        const text = el.textContent || '';
        if ((text.includes('Made in Bolt') || text.includes('Bolt.new') || text.includes('Powered by Bolt')) && el.children.length === 0) {
          (el as HTMLElement).style.display = 'none';
        }
      });
    };
    kill();
    const observer = new MutationObserver(kill);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(kill, 500);
    return () => { observer.disconnect(); clearInterval(interval); };
  }, []);
}

export default function App() {
  const hash = useHashRoute();
  const config = useAppConfig();
  const [activeTab, setActiveTab] = useState<TabKey>('foryou');
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  useBoltKill();

  useEffect(() => {
    if (config.showTabs && !config.showTabs.includes(activeTab) && config.showTabs.length > 0) {
      setActiveTab(config.showTabs[0] as TabKey);
    }
  }, [config.showTabs, activeTab]);

  if (hash === '#/admin' || hash === '#admin') {
    return <AdminPanel />;
  }

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
    <div className="flex h-[100dvh] flex-col bg-[#0A0A0A] text-white">
      {!isForYou && <Header appName={config.appName} />}
      <main className="flex-1 overflow-hidden">{renderTab()}</main>
      <BottomNav active={activeTab} onChange={setActiveTab} visibleTabs={config.showTabs} />
      {!splashDone && <Splash onDone={finishSplash} />}
    </div>
  );
}
