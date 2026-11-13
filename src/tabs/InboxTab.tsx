import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bell, MessageCircle, Search, Users } from 'lucide-react';
import { supabase, type AppProfile } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import Avatar from '@/components/Avatar';

type InboxNotification = { id: string; recipient_id: string; actor_id: string; kind: string; video_id: string | null; created_at: string; read_at?: string | null };
type Follow = { follower_id: string; following_id: string; created_at?: string };
type InboxTabKey = 'Friends' | 'Activities' | 'Following' | 'Followers' | 'Requests';
const TABS: InboxTabKey[] = ['Friends', 'Activities', 'Following', 'Followers', 'Requests'];

export default function InboxTab() {
  const [tab, setTab] = useState<InboxTabKey>('Friends');
  const [userId, setUserId] = useState('');
  const [unread, setUnread] = useState(0);
  useEffect(() => { void getCurrentUserId().then((id) => setUserId(id || '')); }, []);
  const loadUnread = useCallback(async () => {
    if (!userId) return;
    const { count, error } = await supabase.from('social_notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).is('read_at', null);
    if (error) { console.error('Could not load inbox unread count:', error.message); return; }
    setUnread(count || 0);
  }, [userId]);
  useEffect(() => {
    void loadUnread();
    if (!userId) return;
    const channel = supabase.channel(`inbox-unread-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'social_notifications', filter: `recipient_id=eq.${userId}` }, () => { void loadUnread(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadUnread, userId]);
  return <div className="flex h-full flex-col bg-black text-white">
    <div className="flex shrink-0 items-center gap-3 px-4 py-3"><button type="button" className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold">Inbox</button>{unread > 0 && <span className="rounded-full bg-[#D61E2B] px-3 py-1 text-xs font-bold">{unread} New</span>}</div>
    <div role="tablist" aria-label="Inbox" className="flex shrink-0 gap-5 overflow-x-auto border-b border-white/15 px-4 [scrollbar-width:none]">{TABS.map((key) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`shrink-0 border-b-2 py-3 text-sm font-semibold ${tab === key ? 'border-[#D61E2B] text-white' : 'border-transparent text-white/55'}`}>{key}</button>)}</div>
    <div className="min-h-0 flex-1 overflow-y-auto">{!userId ? <EmptyState text="Sign in to see your inbox."/> : tab === 'Activities' ? <Activities userId={userId} onUnreadChange={loadUnread}/> : <People userId={userId} mode={tab}/>}</div>
  </div>;
}

function Activities({ userId, onUnreadChange }: { userId: string; onUnreadChange: () => void }) {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AppProfile>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('social_notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(100);
    if (error) { console.error('Could not load inbox activities:', error.message); setItems([]); setLoading(false); return; }
    const rows = (data || []) as InboxNotification[];
    setItems(rows);
    const actorIds = [...new Set(rows.map((item) => item.actor_id).filter(Boolean))];
    const videoIds = [...new Set(rows.map((item) => item.video_id).filter(Boolean))] as string[];
    const [profileResult, videoResult] = await Promise.all([
      actorIds.length ? supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', actorIds) : Promise.resolve({ data: [] }),
      videoIds.length ? supabase.from('videos').select('id,title').in('id', videoIds) : Promise.resolve({ data: [] }),
    ]);
    setProfiles(Object.fromEntries((profileResult.data || []).map((p) => [p.id, p as AppProfile])));
    setTitles(Object.fromEntries((videoResult.data || []).map((v) => [v.id, v.title || 'your video'])));
    setLoading(false);
    const unreadIds = rows.filter((item) => !item.read_at).map((item) => item.id);
    if (unreadIds.length) {
      const { error: updateError } = await supabase.from('social_notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds).eq('recipient_id', userId);
      if (updateError) console.error('Could not mark inbox activities read:', updateError.message);
      else onUnreadChange();
    }
  }, [userId, onUnreadChange]);
  useEffect(() => { void load(); const channel = supabase.channel(`inbox-activities-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'social_notifications', filter: `recipient_id=eq.${userId}` }, () => { void load(); }).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [load, userId]);
  if (loading) return <p className="py-12 text-center text-sm text-white/60">Loading activities…</p>;
  if (!items.length) return <EmptyState text="No activities yet."/>;
  return <div className="divide-y divide-white/10">{items.map((item) => { const p = profiles[item.actor_id]; const action = item.kind === 'like' ? 'liked' : item.kind === 'comment' ? 'commented on' : item.kind === 'follow' ? 'started following you' : 'shared'; return <article key={item.id} className="flex items-center gap-3 px-4 py-4"><Avatar name={p?.display_name || p?.username || 'ORNEX user'} size={42}/><p className="min-w-0 flex-1 text-sm"><strong>{p?.display_name || (p?.username ? `@${p.username}` : 'Someone')}</strong> {action}{item.kind !== 'follow' ? ` ${titles[item.video_id || ''] || 'your video'}` : ''}<span className="block text-xs text-white/50">{new Date(item.created_at).toLocaleString()}</span></p>{!item.read_at && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-[#D61E2B]"/>}</article>; })}</div>;
}

function People({ userId, mode }: { userId: string; mode: Exclude<InboxTabKey, 'Activities'> }) {
  const [rows, setRows] = useState<Follow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AppProfile>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [following, followers] = await Promise.all([
      supabase.from('follows').select('follower_id,following_id,created_at').eq('follower_id', userId),
      supabase.from('follows').select('follower_id,following_id,created_at').eq('following_id', userId),
    ]);
    if (following.error || followers.error) console.error('Could not load inbox follows:', following.error?.message || followers.error?.message);
    const ownFollowing = (following.data || []) as Follow[];
    const ownFollowers = (followers.data || []) as Follow[];
    const mutualIds = new Set(ownFollowing.map((f) => f.following_id).filter((id) => ownFollowers.some((f) => f.follower_id === id)));
    const selected = mode === 'Following' ? ownFollowing : mode === 'Followers' || mode === 'Requests' ? ownFollowers : ownFollowing.filter((f) => mutualIds.has(f.following_id));
    const peopleIds = [...new Set(selected.map((f) => mode === 'Following' || mode === 'Friends' ? f.following_id : f.follower_id))];
    setRows(selected);
    if (peopleIds.length) {
      const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', peopleIds);
      if (error) console.error('Could not load inbox profiles:', error.message);
      const indexed = Object.fromEntries((data || []).map((p) => [p.id, p as AppProfile])); setProfiles(indexed);
    } else setProfiles({});
    setLoading(false);
  }, [userId, mode]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const term = query.trim().replace(/^@/, '');
    if (!term) { setResults([]); return; }
    const timer = window.setTimeout(() => { void supabase.from('profiles').select('id,username,display_name,avatar_url').neq('id', userId).ilike('username', `%${term}%`).limit(20).then(({ data, error }) => { if (error) console.error('User search failed:', error.message); setResults((data || []) as AppProfile[]); }); }, 250);
    return () => window.clearTimeout(timer);
  }, [query, userId]);
  const displayed = mode === 'Friends' && query.trim() ? results : rows.map((row) => profiles[mode === 'Following' || mode === 'Friends' ? row.following_id : row.follower_id]).filter(Boolean) as AppProfile[];
  const friendHeader = mode === 'Friends';
  const emptyTitle = friendHeader ? 'No friends found' : mode === 'Requests' ? 'No follow requests' : `No ${mode.toLowerCase()} yet`;
  if (loading) return <p className="py-12 text-center text-sm text-white/60">Loading…</p>;
  return <section>
    {friendHeader && <label className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2"><Search className="h-4 w-4 text-white/60"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for users to connect with" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>}
    {!displayed.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><Users className="mb-3 h-9 w-9 text-white/40"/><h2 className="font-semibold">{emptyTitle}</h2><p className="mt-1 text-sm text-white/60">{friendHeader ? 'Search for users to connect with' : 'People you connect with will show up here.'}</p></div> : <div className="divide-y divide-white/10">{displayed.map((person) => <div key={person.id} className="flex items-center gap-3 px-4 py-3"><Avatar name={person.display_name || person.username || 'ORNEX user'} size={42}/><div className="min-w-0"><p className="truncate text-sm font-semibold">{person.display_name || person.username}</p><p className="truncate text-xs text-white/55">@{person.username}</p></div>{mode === 'Friends' && query.trim() && <button className="ml-auto rounded-full bg-[#D61E2B] px-4 py-1.5 text-xs font-bold" onClick={async () => { const { error } = await supabase.from('follows').insert({ follower_id: userId, following_id: person.id }); if (error) console.error('Could not follow user:', error.message); else { setQuery(''); await load(); } }}>Follow</button>}</div>)}</div>}
  </section>;
}
function EmptyState({ text }: { text: string }) { return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><Bell className="mb-3 h-9 w-9 text-white/40"/><p className="text-sm text-white/60">{text}</p></div>; }
