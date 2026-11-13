import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import BottomNav, { type TabKey } from '@/components/BottomNav';
import ForYouTab from '@/tabs/ForYouTab';
import ExploreTab from '@/tabs/ExploreTab';
import PostTab from '@/tabs/PostTab';
import InboxTab from '@/tabs/InboxTab';
import MeTab from '@/tabs/MeTab';
import { useAppConfig } from '@/lib/appConfig';
import { getGuestProfile } from '@/lib/user';
function useHashRoute():string{const [hash,setHash]=useState(window.location.hash);useEffect(()=>{const onChange=()=>setHash(window.location.hash);window.addEventListener('hashchange',onChange);return()=>window.removeEventListener('hashchange',onChange);},[]);return hash;}
export default function App(){const hash=useHashRoute();const config=useAppConfig();const [activeTab,setActiveTab]=useState<TabKey>('foryou');useEffect(()=>{getGuestProfile();},[]);useEffect(()=>{if(config.showTabs&&!config.showTabs.includes(activeTab)&&config.showTabs.length>0)setActiveTab(config.showTabs[0] as TabKey);},[config.showTabs,activeTab]);if(hash==='#/admin'||hash==='#admin')window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}`);const render=()=>{switch(activeTab){case'foryou':return <ForYouTab onPostClick={()=>setActiveTab('post')}/>;case'explore':return <ExploreTab/>;case'post':return <PostTab onPosted={()=>setActiveTab('foryou')}/>;case'inbox':return <InboxTab/>;case'me':return <MeTab/>;default:return <ForYouTab onPostClick={()=>setActiveTab('post')}/>;}};return <div className="flex h-[100dvh] flex-col bg-black text-white">{activeTab!=='foryou'&&<Header appName={config.appName}/>}<main className="min-h-0 flex-1 overflow-hidden bg-black">{render()}</main><BottomNav active={activeTab} onChange={setActiveTab}/></div>;}
