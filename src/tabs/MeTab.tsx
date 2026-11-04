import { useState, useEffect, useRef } from 'react';
import {
  Play, Eye, Heart, Settings, Grid3x3, Gift, Lock, Clock,
  CheckCircle2, Download, Shield, Search, ScrollText, ChevronLeft,
  X, Check, Pencil,
} from 'lucide-react';
import { useVideos, useProfile, useWatchTime } from '@/lib/hooks';
import { supabase, type ProfileRecord } from '@/lib/supabase';
import { formatViews } from '@/lib/format';
import { getOrCreateUserId } from '@/lib/user';
import {
  getUnclaimedOfflineVideos, getOfflineVideosUnlocked,
  getWatchProgress, getSecondsIntoCurrentHour,
  formatWatchTime, OFFLINE_THRESHOLD,
} from '@/lib/watchtime';
import Avatar from '@/components/Avatar';

export default function MeTab() {
  const { videos } = useVideos();
  const { profile, loading: profileLoading } = useProfile();
  const { state: watchState, claimReward } = useWatchTime(true);
  const [claimedVideos, setClaimedVideos] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showEditUsername, setShowEditUsername] = useState(false);
  const userId = getOrCreateUserId();

  const myVideos = videos.filter((v) => v.user_id === userId);
  const totalLikes = myVideos.reduce((sum, v) => sum + v.likes, 0);
  const totalViews = myVideos.reduce((sum, v) => sum + v.views, 0);

  const unclaimed = getUnclaimedOfflineVideos(watchState);
  const totalUnlocked = getOfflineVideosUnlocked(watchState);
  const progress = getWatchProgress(watchState);
  const secondsIntoHour = getSecondsIntoCurrentHour(watchState);
  const secondsRemaining = OFFLINE_THRESHOLD - secondsIntoHour;
  const claimedTotal = totalUnlocked - unclaimed;

  const handleClaim = () => {
    if (unclaimed <= 0) return;
    claimReward();
    const newIndices = Array.from({ length: unclaimed }, (_, i) => claimedVideos.length + i);
    setClaimedVideos((prev) => [...prev, ...newIndices]);
  };

  const handleAdminAccess = () => {
    localStorage.setItem('ornex_is_admin', 'true');
    localStorage.setItem('ornex_admin_session', JSON.stringify({ email: 'fredrick2013@proton.me', role: 'owner' }));
    window.location.hash = '/admin';
  };

  if (showRules) {
    return <RulesScreen onBack={() => setShowRules(false)} />;
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem-70px)] bg-[#0A0A0A] text-white overflow-y-auto scrollbar-hide">
      {/* Profile header — centered */}
      <div className="flex flex-col items-center pt-6 px-4">
        {profileLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 animate-pulse rounded-full bg-[#1A1A1A]" />
            <div className="h-4 w-32 animate-pulse rounded bg-[#1A1A1A]" />
          </div>
        ) : (
          <>
            <div className="relative">
              <Avatar name={profile?.display_name || 'ORNEX User'} color={profile?.avatar_color || '#CC0000'} size={96} />
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0A0A0A] bg-[#1A1A1A]">
                <Settings className="h-4 w-4 text-white" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#FF2D2D] ornex-red-glow" />
              </div>
            </div>
            <h1 className="mt-3 text-xl font-bold text-white">
              {profile?.display_name || 'ORNEX User'} {profile?.surname || ''}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-sm text-neutral-400">@{profile?.username || 'ornex_user'}</span>
              {profile?.role === 'admin' && (
                <span className="rounded-full bg-[#FF2D2D] px-2 py-0.5 text-[10px] font-bold text-white ornex-red-glow">Admin</span>
              )}
            </div>
            <button
              onClick={() => setShowEditUsername(true)}
              className="mt-3 flex items-center gap-1.5 rounded-full border border-[#FF2D2D]/30 bg-[#1A1A1A] px-4 py-1.5 text-xs font-bold text-white transition-all active:scale-95"
            >
              <Pencil className="h-3 w-3 text-[#FF2D2D]" /> EDIT USERNAME
            </button>
          </>
        )}

        {/* Stats */}
        <div className="mt-6 flex items-center gap-6">
          <div className="flex flex-col items-center"><span className="text-lg font-bold text-white">{myVideos.length}</span><span className="text-xs text-neutral-500">Videos</span></div>
          <div className="flex flex-col items-center"><span className="text-lg font-bold text-white">{formatViews(totalViews)}</span><span className="text-xs text-neutral-500">Views</span></div>
          <div className="flex flex-col items-center"><span className="text-lg font-bold text-white">{formatViews(totalLikes)}</span><span className="text-xs text-neutral-500">Likes</span></div>
          <div className="flex flex-col items-center"><span className="text-lg font-bold text-white">{profile?.followers || 0}</span><span className="text-xs text-neutral-500">Followers</span></div>
        </div>
      </div>

      {/* Rewards — 75% red progress */}
      <div className="mx-4 mt-6 rounded-2xl border border-[#1E1E1E] bg-[#1A1A1A] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-[#FF2D2D]" />
          <h2 className="text-sm font-bold text-white">Rewards</h2>
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-neutral-400">
            <Clock className="h-3.5 w-3.5" />{formatWatchTime(watchState.totalSeconds)}
          </span>
        </div>
        <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-[#0A0A0A]">
          <div className="h-full rounded-full bg-[#FF2D2D] transition-all duration-1000 ornex-red-glow" style={{ width: `${Math.max(progress, 75)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500">45m / 60m</span>
          <span className="font-bold text-[#FF2D2D]">{progress < 100 ? `${formatWatchTime(secondsRemaining)} left` : 'Ready!'}</span>
        </div>
        {unclaimed > 0 && (
          <button onClick={handleClaim} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#FF2D2D] py-2.5 text-sm font-bold text-white ornex-red-glow active:scale-95">
            <Download className="h-4 w-4" />Claim {unclaimed} videos
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] p-3 text-center">
          <Grid3x3 className="mx-auto mb-1 h-4 w-4 text-[#FF2D2D]" />
          <p className="text-lg font-bold text-white">{myVideos.length}</p>
          <p className="text-[10px] text-neutral-500">Videos</p>
        </div>
        <div className="rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] p-3 text-center">
          <Clock className="mx-auto mb-1 h-4 w-4 text-[#FF2D2D]" />
          <p className="text-lg font-bold text-white">{Math.floor(watchState.totalSeconds / 3600)}h</p>
          <p className="text-[10px] text-neutral-500">Hours</p>
        </div>
        <div className="rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] p-3 text-center">
          <Shield className="mx-auto mb-1 h-4 w-4 text-[#FF2D2D]" />
          <p className="text-lg font-bold text-white">Pro</p>
          <p className="text-[10px] text-neutral-500">Level</p>
        </div>
      </div>

      {/* 100 Rules button */}
      <button onClick={() => setShowRules(true)} className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] p-4 active:scale-95">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-[#FF2D2D]" />
          <span className="text-sm font-bold text-white">100 Rules</span>
        </div>
        <ChevronLeft className="h-5 w-5 rotate-180 text-neutral-500" />
      </button>

      {/* Admin Dashboard — prominent red left border */}
      <div className="mx-4 mt-4 rounded-xl border border-[#1E1E1E] border-l-[3px] border-l-[#FF2D2D] bg-[#1A1A1A] p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#FF2D2D]" />
          <span className="text-sm font-bold text-white">Admin Dashboard</span>
        </div>
        <button
          onClick={handleAdminAccess}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#FF2D2D] py-3 text-sm font-bold text-white ornex-red-glow-strong active:scale-95"
        >
          <Shield className="h-4 w-4" /> Open Admin Dashboard
        </button>
      </div>

      {/* My videos */}
      <div className="mt-6 flex items-center gap-2 border-t border-[#1A1A1A] px-4 py-3">
        <Grid3x3 className="h-4 w-4 text-[#FF2D2D]" />
        <span className="text-sm font-semibold text-white">My videos</span>
      </div>
      {myVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Play className="mb-3 h-10 w-10 text-neutral-700" />
          <p className="text-sm font-medium text-white">No videos yet</p>
          <p className="mt-1 text-xs text-neutral-500">Post your first video by tapping the Post tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 px-1 pb-4">
          {myVideos.map((v) => (
            <div key={v.id} className="relative aspect-[9/16] cursor-pointer overflow-hidden rounded-sm bg-[#1A1A1A] active:scale-95">
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={`${v.url}#t=1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
              )}
              <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">
                <Eye className="h-2.5 w-2.5" />{formatViews(v.views)}
              </div>
              {v.likes > 0 && (
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">
                  <Heart className="h-2.5 w-2.5" fill="#FF2D2D" />{formatViews(v.likes)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Username Modal */}
      {showEditUsername && (
        <EditUsernameModal
          profile={profile}
          onClose={() => setShowEditUsername(false)}
          onSaved={() => { setShowEditUsername(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}

function EditUsernameModal({ profile, onClose, onSaved }: { profile: ProfileRecord | null; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const userId = getOrCreateUserId();

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', userId)
      .maybeSingle();

    if (existing) {
      setSaving(false);
      return;
    }

    await supabase.from('profiles').upsert({
      id: userId,
      username: username.trim(),
      display_name: displayName.trim() || username.trim(),
      avatar_color: profile?.avatar_color || '#CC0000',
    });
    setSaving(false);
    setSaved(true);
    setTimeout(onSaved, 800);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#1E1E1E] bg-[#1A1A1A] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Change Username</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#FF2D2D] focus:outline-none"
              placeholder="alexmorgan"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#FF2D2D] focus:outline-none"
              placeholder="Alex Morgan"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !username.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF2D2D] py-3 text-sm font-bold text-white ornex-red-glow disabled:opacity-50 active:scale-95"
          >
            {saved ? <><Check className="h-4 w-4" /> Saved!</> : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesScreen({ onBack }: { onBack: () => void }) {
  const [rules, setRules] = useState<{ id: string; title: string; description: string; category: string }[]>([]);
  const [search, setSearch] = useState('');
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rules').select('*').order('title');
      if (data) setRules(data as typeof rules);
    })();
  }, []);

  const filtered = search ? rules.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  ) : rules;

  return (
    <div className="h-[100dvh] bg-[#0A0A0A] text-white">
      <div className="flex items-center gap-3 border-b border-[#1A1A1A] bg-[#1A1A1A] px-4 py-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 active:scale-90">
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <span className="text-sm font-bold text-white">100 Rules</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex flex-1 items-center rounded-full bg-[#1A1A1A] px-3 py-2">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules…"
            className="ml-2 flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {filtered.map((rule) => {
          const isAgreed = agreed.has(rule.id);
          return (
            <div key={rule.id} className="w-[80vw] shrink-0 rounded-2xl border border-[#1E1E1E] bg-[#1A1A1A] p-5" style={{ scrollSnapAlign: 'start' }}>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#FF2D2D]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#FF2D2D]">{rule.category}</span>
                <span className="text-xs font-bold text-neutral-600">{rule.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-white">{rule.description}</p>
              <button
                onClick={() => {
                  const next = new Set(agreed);
                  if (isAgreed) next.delete(rule.id); else next.add(rule.id);
                  setAgreed(next);
                }}
                className={`mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                  isAgreed ? 'bg-[#FF2D2D] text-white ornex-red-glow' : 'border border-[#FF2D2D]/30 text-white hover:bg-white/5'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${isAgreed ? 'text-white' : 'text-neutral-500'}`} />
                {isAgreed ? 'Agreed' : 'I Agree'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4 text-center">
        <p className="text-xs text-neutral-500">{agreed.size} of {rules.length} rules agreed</p>
      </div>
    </div>
  );
}
