import { useCallback, useEffect, useState } from 'react';
import { Activity, Check, MessageCircle, Send, Users } from 'lucide-react';
import { supabase, type AppProfile } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import { formatTimeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';

type InboxNotification = { id: string; recipient_id: string; actor_id: string; kind: string; video_id: string | null; created_at: string };
type InboxMessage = { id: string; sender_id: string; recipient_id: string; message: string; created_at: string };
type InboxTabKey = 'notifications' | 'messages';

export default function InboxTab() {
  const [tab, setTab] = useState<InboxTabKey>('notifications');
  const [userId, setUserId] = useState('');
  useEffect(() => { void getCurrentUserId().then((id) => setUserId(id || '')); }, []);

  return <div className="flex h-full flex-col bg-black text-white">
    <header className="px-4 pb-3 pt-4"><h1 className="text-2xl font-bold">Inbox</h1><p className="mt-1 text-sm text-white/60">Your notifications and messages</p></header>
    <div role="tablist" aria-label="Inbox" className="flex border-b border-white/15 px-4">
      {(['notifications', 'messages'] as const).map((key) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`mr-6 border-b-2 py-3 text-sm font-semibold capitalize ${tab === key ? 'border-[#D61E2B] text-white' : 'border-transparent text-white/55'}`}>{key}</button>)}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">{!userId ? <EmptyState icon={MessageCircle} text="Sign in to see your inbox."/> : tab === 'notifications' ? <Notifications userId={userId}/> : <Messages userId={userId}/>}</div>
  </div>;
}

function Notifications({ userId }: { userId: string }) {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AppProfile>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('social_notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(100);
    if (error) { setItems([]); setLoading(false); return; }
    const notifications = (data || []) as InboxNotification[];
    setItems(notifications);
    const actorIds = [...new Set(notifications.map((item) => item.actor_id).filter(Boolean))];
    const videoIds = [...new Set(notifications.map((item) => item.video_id).filter(Boolean))] as string[];
    const [profileResult, videoResult] = await Promise.all([
      actorIds.length ? supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', actorIds) : Promise.resolve({ data: [] }),
      videoIds.length ? supabase.from('videos').select('id,title').in('id', videoIds) : Promise.resolve({ data: [] }),
    ]);
    setProfiles(Object.fromEntries((profileResult.data || []).map((profile) => [profile.id, profile as AppProfile])));
    setTitles(Object.fromEntries((videoResult.data || []).map((video) => [video.id, video.title || 'your video'])));
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    void load();
    const channel = supabase.channel(`inbox-notifications-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'social_notifications', filter: `recipient_id=eq.${userId}` }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, userId]);
  if (loading) return <p className="py-12 text-center text-sm text-white/60">Loading notifications…</p>;
  if (!items.length) return <EmptyState icon={Activity} text="No notifications yet."/>;
  return <div className="divide-y divide-white/10">{items.map((item) => {
    const profile = profiles[item.actor_id];
    const action = item.kind === 'like' ? 'liked' : item.kind === 'comment' ? 'commented on' : item.kind === 'follow' ? 'started following you' : 'shared';
    return <article key={item.id} className="flex items-center gap-3 px-4 py-4">
      <Avatar name={profile?.display_name || profile?.username || 'ORNEX user'} size={42}/>
      <div className="min-w-0 flex-1"><p className="text-sm"><strong>{profile?.display_name || (profile?.username ? `@${profile.username}` : 'Someone')}</strong> {action}{item.kind !== 'follow' ? ` ${titles[item.video_id || ''] || 'your video'}` : ''}</p><p className="mt-1 text-xs text-white/50">{formatTimeAgo(item.created_at)}</p></div>
      {item.kind === 'follow' ? <Users className="h-5 w-5 text-white/50"/> : <Heart className="h-5 w-5 text-[#D61E2B]"/>}
    </article>;
  })}</div>;
}

function Messages({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AppProfile>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('chats').select('id,sender_id,recipient_id,message,created_at').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: true }).limit(500);
    if (error) { setMessages([]); setLoading(false); return; }
    const rows = (data || []) as InboxMessage[];
    setMessages(rows);
    const otherIds = [...new Set(rows.map((message) => message.sender_id === userId ? message.recipient_id : message.sender_id).filter(Boolean))];
    if (otherIds.length) {
      const { data: profileRows } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', otherIds);
      setProfiles(Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile as AppProfile])));
    } else setProfiles({});
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    void load();
    const channel = supabase.channel(`inbox-messages-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, userId]);
  const conversations = new Map<string, InboxMessage>();
  for (const message of messages) conversations.set(message.sender_id === userId ? message.recipient_id : message.sender_id, message);
  const selectedMessages = selected ? messages.filter((message) => message.sender_id === selected || message.recipient_id === selected) : [];
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!selected || !value) return;
    const { error } = await supabase.from('chats').insert({ sender_id: userId, recipient_id: selected, message: value });
    if (error) { window.alert('Could not send your message. Please try again.'); return; }
    setText('');
    await load();
  };
  if (loading) return <p className="py-12 text-center text-sm text-white/60">Loading messages…</p>;
  if (selected) {
    const profile = profiles[selected];
    return <section className="flex h-full min-h-[300px] flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 p-4"><button onClick={() => setSelected(null)} className="text-sm text-white/70">Back</button><Avatar name={profile?.display_name || profile?.username || 'ORNEX user'} size={36}/><p className="font-semibold">{profile?.display_name || `@${profile?.username || 'user'}`}</p></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{selectedMessages.map((message) => <p key={message.id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${message.sender_id === userId ? 'ml-auto bg-[#D61E2B]' : 'bg-white/10'}`}>{message.message}</p>)}</div>
      <form onSubmit={(event) => void send(event)} className="flex gap-2 border-t border-white/10 p-3"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message…" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none"/><button type="submit" disabled={!text.trim()} aria-label="Send message" className="rounded-full bg-[#D61E2B] p-3 disabled:opacity-50"><Send className="h-4 w-4"/></button></form>
    </section>;
  }
  if (!conversations.size) return <EmptyState icon={MessageCircle} text="No messages yet."/>;
  return <div className="divide-y divide-white/10">{[...conversations.entries()].sort((a, b) => Date.parse(b[1].created_at) - Date.parse(a[1].created_at)).map(([otherId, message]) => {
    const profile = profiles[otherId];
    return <button key={otherId} onClick={() => setSelected(otherId)} className="flex w-full items-center gap-3 px-4 py-4 text-left"><Avatar name={profile?.display_name || profile?.username || 'ORNEX user'} size={44}/><span className="min-w-0 flex-1"><span className="block font-semibold">{profile?.display_name || `@${profile?.username || 'user'}`}</span><span className="mt-1 block truncate text-sm text-white/60">{message.message}</span></span><span className="text-xs text-white/45">{formatTimeAgo(message.created_at)}</span></button>;
  })}</div>;
}

function EmptyState({ icon: Icon, text }: { icon: typeof Activity; text: string }) {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><Icon className="mb-3 h-9 w-9 text-white/40"/><p className="text-sm text-white/60">{text}</p></div>;
}
