import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pencil, Play, Plus, Settings, Share2, X } from 'lucide-react';
import { useVideos, useProfile } from '@/lib/hooks';
import { supabase, type ProfileRecord, type VideoRecord } from '@/lib/supabase';
import { formatViews } from '@/lib/utils';
import { getCurrentUserId } from '@/lib/user';

type ProfileTab = 'videos' | 'liked';
type EditableProfile = ProfileRecord & { bio?: string };

export default function MeTab() {
  const { videos } = useVideos();
  const { profile, setProfile, loading: profileLoading } = useProfile();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('videos');
  const [likedVideos, setLikedVideos] = useState<VideoRecord[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const myVideos = useMemo(() => videos.filter((video) => video.user_id === userId), [videos, userId]);
  const displayedVideos = activeTab === 'videos' ? myVideos : likedVideos;
  const username = profile?.username || 'ornex_user';
  const displayName = profile?.display_name || 'ORNEX User';
  const bio = (profile as EditableProfile | null)?.bio || '';

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
      if (myVideos.length === 0) setLikesCount(0);
      else {
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

  const saveAvatar = async (file?: File) => {
    setShowAvatarMenu(false);
    setAvatarError('');
    if (!file || !userId || !profile) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Choose an image smaller than 5 MB.'); return; }
    setAvatarSaving(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      setAvatarError(uploadError.message || 'Could not upload your photo.');
      setAvatarSaving(false);
      return;
    }
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
    const { data, error } = await supabase.from('profiles').update({ avatar_url: publicUrl.publicUrl }).eq('id', userId).select().single();
    if (error || !data) {
      await supabase.storage.from('avatars').remove([path]);
      setAvatarError(error?.message || 'Could not save your profile photo.');
      setAvatarSaving(false);
      return;
    }
    setProfile(data as ProfileRecord);
    // Keep denormalized video profile fields in sync where those columns are available.
    await supabase.from('videos').update({ avatar_url: publicUrl.publicUrl }).eq('user_id', userId);
    setAvatarSaving(false);
  };

  const removeAvatar = async () => {
    setShowAvatarMenu(false);
    setAvatarError('');
    if (!userId || !profile) return;
    setAvatarSaving(true);
    const oldUrl = profile.avatar_url || '';
    const { data, error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId).select().single();
    if (error || !data) {
      setAvatarError(error?.message || 'Could not remove your profile photo.');
      setAvatarSaving(false);
      return;
    }
    setProfile(data as ProfileRecord);
    await supabase.from('videos').update({ avatar_url: null }).eq('user_id', userId);
    const storageMarker = '/storage/v1/object/public/avatars/';
    const storagePath = oldUrl.includes(storageMarker) ? oldUrl.split(storageMarker)[1]?.split('?')[0] : '';
    if (storagePath) await supabase.storage.from('avatars').remove([decodeURIComponent(storagePath)]);
    setAvatarSaving(false);
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
        <button type="button" onClick={() => setShowAvatarMenu(true)} aria-label="Change profile photo" className="relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#D61E2B] bg-[#000000] text-3xl font-bold tracking-tight text-[#FFFFFF]">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={`${displayName}'s profile`} className="h-full w-full object-cover" /> : (displayName.trim().slice(0, 2).toUpperCase() || 'OU')}
          {avatarSaving && <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs">Saving…</span>}
        </button>
        <h2 className="mt-3 text-base font-bold text-[#FFFFFF]">{displayName}</h2>
        {bio && <p className="mx-auto mt-1 max-w-xs whitespace-pre-wrap text-sm leading-5 text-[#FFFFFF]/60">{bio}</p>}
        {(avatarError) && <p role="alert" className="mx-auto mt-2 max-w-xs text-sm text-red-400">{avatarError}</p>}

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
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#D61E2B] bg-[#000000]"><Plus className="h-8 w-8 text-[#D61E2B]" strokeWidth={2} /></div>
          <p className="text-base font-bold text-[#FFFFFF]">{activeTab === 'videos' ? 'No videos yet' : 'No liked videos yet'}</p>
          {activeTab === 'videos' && <p className="mt-1 text-sm text-[#FFFFFF]/60">Your videos will appear here.</p>}
        </div>
      ) : <div className="grid grid-cols-3 gap-px bg-[#000000]">{displayedVideos.map((video) => <VideoTile key={video.id} video={video} />)}</div>}

      <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => { void saveAvatar(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={(event) => { void saveAvatar(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      {profileLoading && <div className="sr-only" aria-live="polite">Loading profile</div>}
      {showAvatarMenu && <AvatarMenu onClose={() => setShowAvatarMenu(false)} onCamera={() => cameraInput.current?.click()} onGallery={() => galleryInput.current?.click()} onRemove={() => void removeAvatar()} hasPhoto={!!profile?.avatar_url} />}
      {showEditProfile && <EditProfileModal profile={profile as EditableProfile | null} userId={userId} onClose={() => setShowEditProfile(false)} onSaved={(updated) => setProfile(updated)} />}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="flex flex-col items-center"><span className="text-base font-bold text-[#FFFFFF]">{formatViews(value)}</span><span className="mt-0.5 text-xs text-[#FFFFFF]/60">{label}</span></div>;
}

function ProfileTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`relative flex h-12 items-center justify-center text-sm font-semibold ${active ? 'text-[#FFFFFF]' : 'text-[#FFFFFF]/60'}`}>{label}{active && <span className="absolute bottom-0 h-[3px] w-12 bg-[#D61E2B]" />}</button>;
}

function VideoTile({ video }: { video: VideoRecord }) {
  return <div className="relative aspect-[9/16] overflow-hidden bg-[#000000]">
    {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.caption || video.title || 'Video thumbnail'} loading="lazy" className="h-full w-full object-cover" /> : <video src={`${video.url}#t=1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />}
    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-[#000000]/70 px-1.5 py-1 text-xs font-semibold text-[#FFFFFF]"><Play className="h-3.5 w-3.5 fill-[#D61E2B] text-[#D61E2B]" />{formatViews(video.views)}</div>
  </div>;
}

function AvatarMenu({ onClose, onCamera, onGallery, onRemove, hasPhoto }: { onClose: () => void; onCamera: () => void; onGallery: () => void; onRemove: () => void; hasPhoto: boolean }) {
  return <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/70 p-3" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Change profile photo" className="w-full max-w-sm overflow-hidden rounded-xl bg-[#171717] pb-2" onClick={(event) => event.stopPropagation()}>
      <h2 className="border-b border-white/10 px-4 py-3 text-center text-sm font-semibold text-white">Change Profile Pic</h2>
      <button type="button" onClick={onCamera} className="w-full border-b border-white/10 py-4 text-center text-base text-white">Take Photo</button>
      <button type="button" onClick={onGallery} className="w-full border-b border-white/10 py-4 text-center text-base text-white">Choose from Gallery</button>
      {hasPhoto && <button type="button" onClick={onRemove} className="w-full border-b border-white/10 py-4 text-center text-base text-red-400">Remove Photo</button>}
      <button type="button" onClick={onClose} className="mt-2 w-full py-4 text-center text-base font-semibold text-white">Cancel</button>
    </div>
  </div>;
}

function EditProfileModal({ profile, userId, onClose, onSaved }: { profile: EditableProfile | null; userId: string | null; onClose: () => void; onSaved: (profile: ProfileRecord) => void }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const currentUsername = (profile?.username || '').toLowerCase();
  const normalizedUsername = username.trim().replace(/^@/, '').toLowerCase();

  useEffect(() => {
    if (!normalizedUsername) { setAvailability('idle'); return; }
    if (!/^[a-z0-9._]{3,24}$/.test(normalizedUsername)) { setAvailability('invalid'); return; }
    if (normalizedUsername === currentUsername) { setAvailability('available'); return; }
    let cancelled = false;
    setAvailability('checking');
    const timer = window.setTimeout(() => {
      void supabase.from('profiles').select('id').ilike('username', normalizedUsername).neq('id', userId || '').limit(1).maybeSingle().then(({ data, error }) => {
        if (cancelled) return;
        setAvailability(error ? 'error' : data ? 'taken' : 'available');
      });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [normalizedUsername, currentUsername, userId]);

  const handleSave = async () => {
    setMessage('');
    if (!profile || !userId) { setMessage('Sign in to edit your profile.'); return; }
    if (!displayName.trim()) { setMessage('Enter a name.'); return; }
    if (!/^[a-z0-9._]{3,24}$/.test(normalizedUsername)) { setAvailability('invalid'); return; }
    if (availability !== 'available') return;
    setSaving(true);
    const { data: existing, error: lookupError } = normalizedUsername === currentUsername
      ? { data: null, error: null }
      : await supabase.from('profiles').select('id').ilike('username', normalizedUsername).neq('id', userId).limit(1).maybeSingle();
    if (lookupError || existing) {
      setAvailability(lookupError ? 'error' : 'taken');
      setMessage(lookupError ? 'Could not check username availability. Try again.' : 'That username is already taken.');
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.from('profiles').update({
      username: normalizedUsername,
      display_name: displayName.trim(),
      bio: bio.slice(0, 80),
    }).eq('id', userId).select().single();
    if (error || !data) {
      setMessage(error?.code === '23505' ? 'That username is already taken.' : error?.message || 'Could not save your profile.');
      setAvailability(error?.code === '23505' ? 'taken' : availability);
      setSaving(false);
      return;
    }
    const updated = data as ProfileRecord;
    onSaved(updated);
    // Video rows also cache profile details; update the editable fields to reflect changes in feeds.
    await supabase.from('videos').update({ username: normalizedUsername, display_name: displayName.trim() }).eq('user_id', userId);
    setSaving(false);
    onClose();
  };

  const availabilityText = availability === 'checking' ? 'Checking…' : availability === 'available' ? 'Available' : availability === 'taken' ? 'Taken' : availability === 'invalid' ? 'Use 3–24 letters, numbers, dots, or underscores' : availability === 'error' ? 'Could not check availability' : '';

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#000000]/80 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Edit profile" className="w-full max-w-sm border border-[#FFFFFF]/25 bg-[#000000] p-5" onClick={(event) => event.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-[#FFFFFF]">Edit profile</h2><button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center text-[#FFFFFF]"><X className="h-5 w-5" /></button></div>
      <label htmlFor="profile-name" className="mb-1 block text-xs font-medium text-[#FFFFFF]/60">Name</label>
      <input id="profile-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={50} className="mb-4 w-full border border-[#FFFFFF]/25 bg-[#000000] px-3 py-2.5 text-sm text-[#FFFFFF] outline-none focus:border-[#D61E2B]" />
      <label htmlFor="profile-username" className="mb-1 block text-xs font-medium text-[#FFFFFF]/60">Username</label>
      <div className="flex items-center border border-[#FFFFFF]/25 px-3 focus-within:border-[#D61E2B]"><span className="text-sm text-white/60">@</span><input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, ''))} maxLength={25} autoCapitalize="none" autoCorrect="off" className="w-full bg-transparent px-1 py-2.5 text-sm text-[#FFFFFF] outline-none" /></div>
      {availabilityText && <p aria-live="polite" className={`mb-4 mt-1 text-xs ${availability === 'available' ? 'text-green-400' : availability === 'checking' ? 'text-white/60' : 'text-red-400'}`}>{availabilityText}</p>}
      <label htmlFor="profile-bio" className="mb-1 block text-xs font-medium text-[#FFFFFF]/60">Bio</label>
      <textarea id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value.slice(0, 80))} maxLength={80} rows={3} className="w-full resize-none border border-[#FFFFFF]/25 bg-[#000000] px-3 py-2.5 text-sm text-[#FFFFFF] outline-none focus:border-[#D61E2B]" />
      <p className="mb-4 text-right text-xs text-white/50">{bio.length}/80</p>
      {message && <p role="alert" className="mb-3 text-sm text-red-400">{message}</p>}
      <button type="button" onClick={() => void handleSave()} disabled={saving || !userId || availability !== 'available' || !displayName.trim()} className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#D61E2B] py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? 'Saving…' : <><Check className="h-4 w-4" /> Save</>}
      </button>
    </div>
  </div>;
}
