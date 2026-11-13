import { useCallback, useEffect, useState } from 'react';
import { Bell, Heart, MessageCircle, Search, UserPlus } from 'lucide-react';
import { supabase, type AppProfile } from '@/lib/supabase';
import { getCurrentUserId, getGuestProfile } from '@/lib/user';
import Avatar from '@/components/Avatar';
import OrnexLogo from '@/components/OrnexLogo';

type InboxTabKey = 'Friends' | 'Activities' | 'Following' | 'Followers' | 'Requests';
const TABS: InboxTabKey[] = ['Friends', 'Activities', 'Following', 'Followers', 'Requests'];
type Notification = { id: string; actor_id: string; kind: 'like' | 'comment' | 'follow' | 'share'; created_at: string; read_at?: string | null };

export default function InboxTab() {
  const [tab, setTab] = useState<InboxTabKey>('Friends');
  const [userId, setUserId] = useState('');
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { void getCurrentUserId().then(setUserId); }, []);
  const loadUnread = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase.from('social_notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).is('read_at', null);
    setUnread(count || 0);
  }, [userId]);
  useEffect(() => { void loadUnread(); }, [loadUnread]);
  const openSearch = () => { setTab('Friends'); setSearchOpen(true); };

  return <div className="flex h-full flex-col overflow-hidden bg-black text-white">
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
      <OrnexLogo size={22} />
      <button type="button" onClick={openSearch} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/10 px-4 text-left text-sm text-white/65"><Search size={16}/> <span>Search</span></button>
      <button type="button" aria-label={`${unread} unread notifications`} onClick={() => setTab('Activities')} className="relative flex h-9 w-9 shrink-0 items-center justify-center"><Bell size={21}/>{unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-black bg-[#D61E2B]"/>}</button>
    </header>
    <div className="flex shrink-0 items-center gap-2 px-4 py-3"><span className="rounded-full bg-black px-4 py-2 text-sm font-bold ring-1 ring-white/15">Inbox</span>{unread > 0 && <span className="rounded-full bg-[#D61E2B] px-4 py-2 text-sm font-bold">{unread} New</span>}</div>
    <nav aria-label="Inbox tabs" className="flex shrink-0 gap-6 overflow-x-auto border-b border-white/10 px-4 [scrollbar-width:none]">{TABS.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-0 pb-3 pt-1 text-sm font-semibold ${tab === item ? 'border-[#D61E2B] text-white' : 'border-transparent text-white/55'}`}>{item}</button>)}</nav>
    <main className="min-h-0 flex-1 overflow-y-auto">
      {tab === 'Activities' ? <Activities userId={userId} onRead={loadUnread}/> : <People key={tab} userId={userId} mode={tab} searchOpen={searchOpen} setSearchOpen={setSearchOpen}/>}
    </main>
  </div>;
}

function Activities({ userId, onRead }: { userId: string; onRead: () => void }) {
  const [rows, setRows] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AppProfile>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      const { data } = await supabase.from('social_notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(100);
      const items = (data || []) as Notification[];
      if (!active) return;
      setRows(items);
      const ids = [...new Set(items.map((item) => item.actor_id).filter(Boolean))];
      if (ids.length) {
        const { data: people } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', ids);
        if (active) setProfiles(Object.fromEntries(((people || []) as AppProfile[]).map((person) => [person.id, person])));
      }
      const unreadIds = items.filter((item) => !item.read_at).map((item) => item.id);
      if (unreadIds.length) await supabase.from('social_notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      if (active) { setRows(items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); setLoading(false); onRead(); }
    })();
    return () => { active = false; };
  }, [userId, onRead]);
  if (loading) return <p className="py-12 text-center text-white/60">Loading activities…</p>;
  if (!rows.length) return <Empty title="No activities yet."/>;
  return <div>{rows.map((row) => {
    const person = profiles[row.actor_id];
    const Icon = row.kind === 'like' ? Heart : row.kind === 'comment' ? MessageCircle : UserPlus;
    const action = row.kind === 'like' ? 'liked your video' : row.kind === 'comment' ? 'commented on your video' : row.kind === 'follow' ? 'started following you' : 'shared your video';
    return <div key={row.id} className="flex items-center gap-3 border-b border-white/10 px-4 py-4"><Avatar profile={person} size="sm"/><p className="flex-1 text-sm"><b>{person?.display_name || person?.username || 'Guest'}</b> {action}</p><Icon size={18} className="text-[#D61E2B]"/></div>;
  })}</div>;
}

function People({ userId, mode, searchOpen, setSearchOpen }: { userId: string; mode: Exclude<InboxTabKey, 'Activities'>; searchOpen: boolean; setSearchOpen: (open: boolean) => void }) {
  const [following, setFollowing] = useState<string[]>([]);
  const [people, setPeople] = useState<AppProfile[]>([]);
  const [results, setResults] = useState<AppProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!userId || mode === 'Requests') { setPeople([]); return; }
    let active = true;
    setLoading(true);
    void (async () => {
      const [outgoing, incoming] = await Promise.all([
        supabase.from('follows').select('follower_id,following_id').eq('follower_id', userId),
        supabase.from('follows').select('follower_id,following_id').eq('following_id', userId),
      ]);
      const outgoingRows = outgoing.data || [];
      const incomingRows = incoming.data || [];
      const outgoingIds = outgoingRows.map((row) => row.following_id as string);
      const mutual = new Set(incomingRows.map((row) => row.follower_id as string).filter((id) => outgoingIds.includes(id)));
      setFollowing(outgoingIds);
      const ids = mode === 'Following' ? outgoingIds : mode === 'Followers' ? incomingRows.map((row) => row.follower_id as string) : outgoingIds.filter((id) => mutual.has(id));
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', [...new Set(ids)]);
        if (active) setPeople((data || []) as AppProfile[]);
      } else if (active) setPeople([]);
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [userId, mode]);
  useEffect(() => {
    const term = query.trim().replace(/^@/, '');
    if (!term) { setResults([]); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      void supabase.from('profiles').select('id,username,display_name,avatar_url').or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).neq('id', userId).limit(30).then(({ data }) => { if (active) setResults((data || []) as AppProfile[]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, userId]);
  const toggleFollow = async (person: AppProfile) => {
    const isFollowing = following.includes(person.id);
    setFollowing((current) => isFollowing ? current.filter((id) => id !== person.id) : [...current, person.id]);
    if (isFollowing) await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', person.id);
    else await supabase.from('follows').insert({ follower_id: userId, following_id: person.id });
  };
  const shown = mode === 'Friends' && query.trim() ? results : people;
  const emptyLabel = mode === 'Friends' ? 'No friends found' : mode === 'Requests' ? 'No requests yet' : `No ${mode.toLowerCase()} yet`;
  return <section className="px-4 py-4">
    {(mode === 'Friends' || searchOpen) && searchOpen && <label className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-3"><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for users" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><button type="button" onClick={() => { setSearchOpen(false); setQuery(''); }} className="text-xs text-white/60">Cancel</button></label>}
    {loading && <p className="py-8 text-center text-white/50">Loading…</p>}
    {!loading && shown.length === 0 && mode === 'Friends' && !query.trim() && <div className="flex min-h-[45vh] flex-col items-center justify-center text-center"><p className="text-lg font-bold">No friends found</p><p className="mt-2 text-sm text-white/55">Search for users to connect with</p><button type="button" onClick={() => setSearchOpen(true)} className="mt-5 flex items-center gap-2 rounded-full bg-[#D61E2B] px-5 py-3 text-sm font-bold"><Search size={16}/>Search</button></div>}
    {!loading && shown.length === 0 && !(mode === 'Friends' && !query.trim()) && <p className="py-12 text-center font-semibold text-white/65">{emptyLabel}</p>}
    {shown.map((person) => <div key={person.id} className="flex items-center gap-3 border-b border-white/10 py-3"><Avatar profile={person} size="sm"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.display_name}</p><p className="truncate text-xs text-white/55">@{person.username}</p></div><button type="button" onClick={() => void toggleFollow(person)} className={`rounded-full px-4 py-2 text-xs font-bold ${following.includes(person.id) ? 'bg-white/15' : 'bg-[#D61E2B]'}`}>{following.includes(person.id) ? 'Following' : 'Follow'}</button></div>)}
  </section>;
}
function Empty({ title }: { title: string }) { return <div className="flex flex-col items-center px-6 py-14 text-center"><Bell className="mb-3 h-9 w-9 text-white/40"/><p className="font-semibold">{title}</p></div>; }

void getGuestProfile;
