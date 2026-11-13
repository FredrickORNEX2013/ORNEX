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
    return () => { observer.disconnect(); window.clearInterval(interval); };
  }, []);
}

export default function App() {
  const hash = useHashRoute();
  const config = useAppConfig();
  const [activeTab, setActiveTab] = useState<TabKey>('foryou');
  const [showSplash, setShowSplash] = useState(() => {
    try { return window.localStorage.getItem('ornex-splash-seen') !== 'true'; } catch { return true; }
  });
  const [loading, setLoading] = useState(true);
  const finishSplash = useCallback(() => { setLoading(false); setShowSplash(false); }, []);
  useBoltKill();

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => { setLoading(false); setShowSplash(false); }, 2500);
    return () => window.clearTimeout(fallbackTimer);
  }, []);

  if (hash === '#/admin' || hash === '#admin') return <AdminPanel />;

  return (
    <div aria-busy={loading} className="flex h-[100dvh] flex-col bg-black text-white">
      {activeTab !== 'foryou' && <Header appName={config.appName} />}
      <main className="min-h-0 flex-1 overflow-hidden bg-black">
        {activeTab === 'foryou' && <ForYouTab onPostClick={() => setActiveTab('post')} />}
        {activeTab === 'explore' && <ExploreTab />}
        {activeTab === 'post' && <PostTab onPosted={(isShort) => setActiveTab(isShort ? 'foryou' : 'explore')} />}
        {activeTab === 'inbox' && <InboxTab />}
        {activeTab === 'me' && <MeTab />}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
      {showSplash && <Splash onDone={finishSplash} />}
    </div>
  );
}
