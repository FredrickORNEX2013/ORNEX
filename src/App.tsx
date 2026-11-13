import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import BottomNav, { type TabKey } from '@/components/BottomNav';
import ForYouTab from '@/tabs/ForYouTab';
import ExploreTab from '@/tabs/ExploreTab';
import PostTab from '@/tabs/PostTab';
import InboxTab from '@/tabs/InboxTab';
import MeTab from '@/tabs/MeTab';
import { useAppConfig } from '@/lib/appConfig';
import { getGuestProfile } from '@/lib/user';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const config = useAppConfig();
  const [activeTab, setActiveTab] = useState<TabKey>('foryou');
  useEffect(() => { getGuestProfile(); }, []);
  useEffect(() => {
    if (config.showTabs.length && !config.showTabs.includes(activeTab)) setActiveTab(config.showTabs[0] as TabKey);
  }, [config.showTabs, activeTab]);
  if (hash === '#/admin' || hash === '#admin') return <div className="flex h-[100dvh] items-center justify-center bg-black text-white">Admin tools are separate from the guest app.</div>;
  const renderTab = () => {
    switch (activeTab) {
      case 'foryou': return <ForYouTab onPostClick={() => setActiveTab('post')}/>;
      case 'explore': return <ExploreTab/>;
      case 'post': return <PostTab onPosted={() => setActiveTab('foryou')}/>;
      case 'inbox': return <InboxTab/>;
      case 'me': return <MeTab/>;
    }
  };
  const isForYou = activeTab === 'foryou';
  const hasOwnHeader = activeTab === 'inbox';
  return <div className="flex h-[100dvh] flex-col bg-black text-white">{!isForYou && !hasOwnHeader && <Header appName={config.appName}/>}<main className="min-h-0 flex-1 overflow-hidden bg-black">{renderTab()}</main><BottomNav active={activeTab} onChange={setActiveTab}/></div>;
}
