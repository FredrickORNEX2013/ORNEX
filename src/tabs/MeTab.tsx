import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Settings, Share2, X } from 'lucide-react';
import { useVideos, useProfile } from '@/lib/hooks';
import { supabase, type ProfileRecord, type VideoRecord } from '@/lib/supabase';
import { formatViews } from '@/lib/utils';
import { getCurrentUserId } from '@/lib/user';

type ProfileTab = 'videos' | 'liked';

export default function MeTab() {
  const { videos } = useVideos();
  const { profile, loading: profileLoading } = useProfile();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('videos');
  const [likedVideos, setLikedVideos] = useState<VideoRecord[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const myVideos = useMemo(() => videos.filter((video) => video.user_id === userId), [videos, userId]);
  const displayedVideos = activeTab === 'videos' ? myVideos : likedVideos;
  const username = profile?.username || 'ornex_user';
  const displayName = profile?.display_name || 'ORNEX User';
  const bio = (profile as (ProfileRecord & { bio?: string }) | null)?.bio || '';

  useEffect(() => { void getCurrentUserId().then(setUserId); }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [{ count: following }, { count: followers }, { data: likes }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('likes').select('video_id').eq('user_id', userId),
      ]);
      if (cancelled) return;
      setFollowingCount(following || 0);
      setFollowerCount(followers || 0);
      const likedIds = new Set((likes || []).map((like) => like.video_id as string));
      setLikedVideos(videos.filter((video) => likedIds.has(video.id)));

      if (myVideos.length === 0) {
        setLikesCount(0);
      } else {
        const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('video_id', myVideos.map((video) => video.id));
        if (!cancelled) setLikesCount(count || 0);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, videos, myVideos]);

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `@${username} on ORNEX`, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch { /* Sharing can be dismissed by the user. */ }
  };

  return (
    <div className="ornex-me min-h-[calc(100dvh-3.5rem-70px)] overflow-y-auto bg-[#000000] pb-[120px] text-[#FFFFFF]">
      <header className="sticky top-0 z-10 grid h-12 grid-cols-[40px_1fr_40px] items-center bg-[#000000] px-4">
        <span aria-hidden="true" />
        <h1 className="text-center text-base font-bold text-[#FFFFFF]">@{username}</h1>
        <button type="button" aria-label="Edit profile settings" onClick={() => setShowEditProfile(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-[#FFFFFF]">
          <Settings className="h-[21px] w-[21px]" />
        </button>
      </header>

      <section className="px-5 pb-5 pt-5 text-center">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-[#D61E2B] bg-[#000000] text-3xl font-bold tracking-tight text-[#FFFFFF]" aria-label="ORNEX avatar">
          {displayName.trim().slice(0, 2).toUpperCase() || 'OU'}
        </div>
        <h2 className="mt-3 text-base font-bold text-[#FFFFFF]">{displayName}</h2>
        {bio && <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-[#FFFFFF]/60">{bio}</p>}

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 text-center">
          <Stat value={followingCount} label="Following" />
          <Stat value={followerCount} label="Followers" />
          <Stat value={likesCount} label="Likes" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setShowEditProfile(true)} className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#FFFFFF] text-sm font-bold text-[#000000]">
            <Pencil className="h-4 w-4" /> Edit Profile
          </button>
          <button type="button" onClick={() => void shareProfile()} className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#FFFFFF] bg-[#000000] text-sm font-bold text-[#FFFFFF]">
            <Share2 className="h-4 w-4" /> Share Profile
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 border-b border-[#FFFFFF]/20">
        <ProfileTabButton active={activeTab === 'videos'} label="Videos" onClick={() => setActiveTab('videos')} />
        <ProfileTabButton active={activeTab === 'liked'} label="Liked" onClick={() => setActiveTab('liked')} />
      </div>

      {displayedVideos.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#D61E2B] bg-[#000000]">
            <Plus className="h-8 w-8 text-[#D61E2B]" strokeWidth={2} />
          </div>
          <p className="text-base font-bold text-[#FFFFFF]">{activeTab === 'videos' ? 'No videos yet' : 'No liked videos yet'}</p>
          {activeTab === 'videos' && <p className="mt-1 text-sm text-[#FFFFFF]/60">Your videos will appear here.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px bg-[#000000]">
          {displayedVideos.map((video) => <VideoTile key={video.id} video={video} />)}
        </div>
      )}

      {profileLoading && <div className="sr-only" aria-live="polite">Loading profile</div>}
      {showEditProfile && <EditProfileModal profile={profile} onClose={() => setShowEditProfile(false)} onSaved={() => window.location.reload()} />}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="flex flex-col items-center">
    <span className="text-base font-bold text-[#FFFFFF]">{formatViews(value)}</span>
    <span className="mt-0.5 text-xs text-[#FFFFFF]/60">{label}</span>
  </div>;
}

function ProfileTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`relative flex h-12 items-center justify-center text-sm font-semibold ${active ? 'text-[#FFFFFF]' : 'text-[#FFFFFF]/60'}`}>
    {label}
    {active && <span className="absolute bottom-0 h-[3px] w-12 bg-[#D61E2B]" />}
  </button>;
}

function VideoTile({ video }: { video: VideoRecord }) {
  return <div className="relative aspect-[9/16] overflow-hidden bg-[#000000]">
    {video.thumbnail_url ? (
      <img src={video.thumbnail_url} alt={video.caption || video.title || 'Video thumbnail'} loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <video src={`${video.url}#t=1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
    )}
    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-[#000000]/70 px-1.5 py-1 text-xs font-semibold text-[#FFFFFF]">
      <PlayCountIcon />{formatViews(video.views)}
    </div>
  </div>;
}

function PlayCountIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-[#D61E2B]"><path d="M4 2.8c0-.7.8-1.1 1.4-.7l8 5.2a.9.9 0 0 1 0 1.5l-8 5.2c-.6.4-1.4 0-1.4-.7V2.8Z" /></svg>;
}

function EditProfileModal({ profile, onClose, onSaved }: { profile: ProfileRecord | null; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { void getCurrentUserId().then(setUserId); }, []);

  const handleSave = async () => {
    if (!username.trim() || !userId) return;
    setSaving(true);
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.trim()).neq('id', userId).maybeSingle();
    if (existing) { setSaving(false); return; }
    await supabase.from('profiles').upsert({
      id: userId,
      username: username.trim(),
      display_name: displayName.trim() || username.trim(),
      avatar_color: '#000000',
    });
    setSaving(false);
    setSaved(true);
    window.setTimeout(onSaved, 700);
  };

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#000000]/80 p-4" onClick={onClose}>
    <div className="w-full max-w-sm border border-[#FFFFFF]/25 bg-[#000000] p-5" onClick={(event) => event.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#FFFFFF]">Edit profile</h2>
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center text-[#FFFFFF]"><X className="h-5 w-5" /></button>
      </div>
      <label className="mb-1 block text-xs font-medium text-[#FFFFFF]/60">Username</label>
      <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={30} className="mb-4 w-full border border-[#FFFFFF]/25 bg-[#000000] px-3 py-2.5 text-sm text-[#FFFFFF] outline-none focus:border-[#D61E2B]" />
      <label className="mb-1 block text-xs font-medium text-[#FFFFFF]/60">Display name</label>
      <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={50} className="mb-5 w-full border border-[#FFFFFF]/25 bg-[#000000] px-3 py-2.5 text-sm text-[#FFFFFF] outline-none focus:border-[#D61E2B]" />
      <button type="button" onClick={() => void handleSave()} disabled={saving || !username.trim() || !userId} className="flex w-full items-center justify-center gap-2 bg-[#FFFFFF] py-2.5 text-sm font-bold text-[#000000] disabled:opacity-60">
        {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  </div>;
}
