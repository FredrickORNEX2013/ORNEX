import { useState, useEffect } from 'react';
import { Search, Settings, Users, Activity, UserPlus, UserCheck, Check, X } from 'lucide-react';
import { supabase, type ProfileRecord } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/user';
import { formatTimeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';

type TabKey = 'friends' | 'activities' | 'following' | 'followers' | 'requests';

export default function InboxTab() {
  const [tab, setTab] = useState<TabKey>('friends');
  const [search, setSearch] = useState('');
  const userId = getOrCreateUserId();

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'activities', label: 'Activities' },
    { key: 'following', label: 'Following' },
    { key: 'followers', label: 'Followers' },
    { key: 'requests', label: 'Requests' },
  ];

  return (
    <div className="flex h-[calc(100dvh-3.5rem-70px)] flex-col bg-[#0A0A0A]">
      {/* Header: ORNEX left, search+settings right */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-lg font-extrabold tracking-tighter text-white">ORNEX</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-[#1E1E1E] bg-[#1A1A1A] px-3 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="ml-2 w-20 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95">
            <Settings className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Inbox pill + 12 New */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="rounded-full bg-[#1A1A1A] px-4 py-1 text-sm font-bold text-white">Inbox</span>
        <span className="rounded-full bg-[#FF2D2D] px-2.5 py-0.5 text-[10px] font-bold text-white ornex-red-glow">12 New</span>
      </div>

      {/* Filter tabs with red underline */}
      <div className="flex gap-4 border-b border-[#1A1A1A] px-4 pb-0 overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative shrink-0 py-2.5 text-xs font-bold transition-colors ${
              tab === key ? 'text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            {label}
            {tab === key && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#FF2D2D] ornex-red-glow" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {tab === 'friends' && <FriendsTab userId={userId} search={search} />}
        {tab === 'activities' && <ActivitiesTab userId={userId} />}
        {tab === 'following' && <FollowingTab userId={userId} />}
        {tab === 'followers' && <FollowersTab userId={userId} />}
        {tab === 'requests' && <RequestsTab userId={userId} />}
      </div>
    </div>
  );
}

function FriendsTab({ userId, search }: { userId: string; search: string }) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setProfiles(data as ProfileRecord[]);
      setLoading(false);
    })();
  }, [userId]);

  const filtered = search
    ? profiles.filter((p) => p.username.toLowerCase().includes(search.toLowerCase()) || p.display_name.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  if (loading) return <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="mb-3 h-10 w-10 text-neutral-700" />
        <p className="text-sm font-medium text-white">No friends found</p>
        <p className="mt-1 text-xs text-neutral-500">Search for users to connect with</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      {filtered.map((p) => (
        <FriendRow key={p.id} profile={p} currentUserId={userId} />
      ))}
    </div>
  );
}

function FriendRow({ profile, currentUserId }: { profile: ProfileRecord; currentUserId: string }) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
        .maybeSingle();
      setFollowing(!!data);
    })();
  }, [currentUserId, profile.id]);

  const toggleFollow = async () => {
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profile.id);
      setFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id });
      setFollowing(true);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar name={profile.display_name} color={profile.avatar_color} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{profile.display_name}</p>
        <p className="truncate text-xs text-neutral-500">@{profile.username}</p>
      </div>
      <button
        onClick={toggleFollow}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
          following ? 'border border-[#1E1E1E] bg-[#1A1A1A] text-white' : 'bg-[#FF2D2D] text-white ornex-red-glow'
        }`}
      >
        {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

function ActivitiesTab({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<{ type: string; profile?: ProfileRecord; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      const ids = (follows || []).map((f) => f.following_id as string);
      if (ids.length === 0) { setLoading(false); return; }

      const { data: videos } = await supabase
        .from('videos')
        .select('user_id, created_at, title')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(20);

      const profileIds = [...new Set((videos || []).map((v) => v.user_id).filter(Boolean))] as string[];
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', profileIds);
      const profileMap: Record<string, ProfileRecord> = {};
      (profilesData || []).forEach((p) => { profileMap[(p as ProfileRecord).id] = p as ProfileRecord; });

      setActivities((videos || []).map((v) => ({
        type: 'video',
        profile: v.user_id ? profileMap[v.user_id] : undefined,
        created_at: v.created_at,
      })));
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>;
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="mb-3 h-10 w-10 text-neutral-700" />
        <p className="text-sm font-medium text-white">No activity yet</p>
        <p className="mt-1 text-xs text-neutral-500">Follow people to see their activity</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          {a.profile && <Avatar name={a.profile.display_name} color={a.profile.avatar_color} size={40} />}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white">
              <span className="font-bold">@{a.profile?.username || 'user'}</span> posted a new video
            </p>
            <p className="text-xs text-neutral-500">{formatTimeAgo(a.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowingTab({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      const ids = (follows || []).map((f) => f.following_id as string);
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      if (data) setProfiles(data as ProfileRecord[]);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>;
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserPlus className="mb-3 h-10 w-10 text-neutral-700" />
        <p className="text-sm font-medium text-white">Not following anyone yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-xs text-neutral-500">{profiles.length} following</p>
      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <Avatar name={p.display_name} color={p.avatar_color} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{p.display_name}</p>
              <p className="truncate text-xs text-neutral-500">@{p.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowersTab({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: follows } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
      const ids = (follows || []).map((f) => f.follower_id as string);
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      if (data) setProfiles(data as ProfileRecord[]);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>;
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserCheck className="mb-3 h-10 w-10 text-neutral-700" />
        <p className="text-sm font-medium text-white">No followers yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-xs text-neutral-500">{profiles.length} followers</p>
      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <Avatar name={p.display_name} color={p.avatar_color} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{p.display_name}</p>
              <p className="truncate text-xs text-neutral-500">@{p.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsTab({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [handled, setHandled] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: follows } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });
      const ids = (follows || []).map((f) => f.follower_id as string);
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      if (data) setProfiles(data as ProfileRecord[]);
      setLoading(false);
    })();
  }, [userId]);

  const handleAccept = async (profileId: string) => {
    setHandled((prev) => new Set(prev).add(profileId));
  };

  const handleDecline = async (profileId: string) => {
    await supabase.from('follows').delete().eq('follower_id', profileId).eq('following_id', userId);
    setHandled((prev) => new Set(prev).add(profileId));
  };

  if (loading) return <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>;
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserPlus className="mb-3 h-10 w-10 text-neutral-700" />
        <p className="text-sm font-medium text-white">No friend requests</p>
        <p className="mt-1 text-xs text-neutral-500">New follow requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {profiles.filter((p) => !handled.has(p.id)).map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] p-3">
          <Avatar name={p.display_name} color={p.avatar_color} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{p.display_name}</p>
            <p className="truncate text-xs text-neutral-500">@{p.username}</p>
          </div>
          <button
            onClick={() => handleAccept(p.id)}
            className="flex items-center gap-1 rounded-full bg-[#FF2D2D] px-3 py-1.5 text-xs font-bold text-white ornex-red-glow active:scale-95"
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </button>
          <button
            onClick={() => handleDecline(p.id)}
            className="flex items-center gap-1 rounded-full border border-[#1E1E1E] bg-[#1A1A1A] px-3 py-1.5 text-xs font-bold text-neutral-400 active:scale-95"
          >
            <X className="h-3.5 w-3.5" /> Decline
          </button>
        </div>
      ))}
      {profiles.filter((p) => !handled.has(p.id)).length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-500">All requests handled</p>
      )}
    </div>
  );
}
