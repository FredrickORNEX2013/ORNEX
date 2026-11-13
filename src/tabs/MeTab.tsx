import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LogIn, LogOut, Pencil, Play, Share2, UserPlus } from 'lucide-react';
import { supabase, type VideoRecord } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

 type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

type AuthMode = 'login' | 'signup';

function accountUsername(user: User) {
  const fromMetadata = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : '';
  const fromEmail = user.email?.split('@')[0] || 'user';
  const base = (fromMetadata || fromEmail).toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 18) || 'user';
  return `${base}_${user.id.replace(/-/g, '').slice(0, 6)}`;
}

export default function MeTab() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editError, setEditError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [toast, setToast] = useState('');

  const loadAccount = useCallback(async (account: User | null) => {
    setUser(account);
    setProfile(null);
    setVideos([]);
    setLoading(true);
    if (!account) { setLoading(false); return; }
    try {
      const { data: existing, error: profileError } = await supabase.from('profiles').select('*').eq('id', account.id).maybeSingle();
      if (profileError) throw profileError;
      let accountProfile = existing as Profile | null;
      if (!accountProfile) {
        const name = typeof account.user_metadata?.display_name === 'string' ? account.user_metadata.display_name : account.email?.split('@')[0] || 'User';
        const { data, error } = await supabase.from('profiles').insert({
          id: account.id,
          username: accountUsername(account),
          display_name: name,
          bio: '',
          avatar_url: typeof account.user_metadata?.avatar_url === 'string' ? account.user_metadata.avatar_url : null,
        }).select('*').single();
        if (error) throw error;
        accountProfile = data as Profile;
      }
      setProfile(accountProfile);
      const { data: ownVideos, error: videosError } = await supabase.from('videos').select('*').eq('user_id', account.id).order('created_at', { ascending: false });
      if (videosError) throw videosError;
      setVideos((ownVideos || []) as VideoRecord[]);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setToast(error.message);
        setLoading(false);
        return;
      }
      void loadAccount(data.session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) void loadAccount(session?.user ?? null);
    });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, [loadAccount]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const beginEdit = () => {
    if (!profile) return;
    setEditUsername(profile.username || '');
    setEditName(profile.display_name || '');
    setEditBio(profile.bio || '');
    setEditError('');
    setEditing(true);
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setAuthPassword('');
      } else {
        const requestedUsername = (authEmail.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 18) || 'user';
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { username: requestedUsername, display_name: authEmail.split('@')[0] || 'User' } },
        });
        if (error) throw error;
        if (data.session) {
          await loadAccount(data.user);
          setAuthPassword('');
        } else {
          setAuthMessage('Check your email to confirm your account, then return here to sign in.');
        }
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !profile) { setEditError('Sign in to edit your profile.'); return; }
    const username = editUsername.trim().replace(/^@/, '').toLowerCase();
    const displayName = editName.trim();
    if (!/^[a-z0-9._]{3,24}$/.test(username)) { setEditError('Username must be 3–24 letters, numbers, dots, or underscores.'); return; }
    if (!displayName) { setEditError('Enter a display name.'); return; }
    setSaving(true);
    setEditError('');
    try {
      const { data, error } = await supabase.from('profiles').update({ username, display_name: displayName, bio: editBio.trim().slice(0, 160) }).eq('id', user.id).select('*').single();
      if (error) throw error;
      setProfile(data as Profile);
      setEditing(false);
      setToast('Profile saved.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setAvatarError('');
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Choose an image smaller than 5 MB.'); return; }
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
      const imageUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
      const { data, error } = await supabase.from('profiles').update({ avatar_url: imageUrl }).eq('id', user.id).select('*').single();
      if (error) throw error;
      setProfile(data as Profile);
      setToast('Profile photo saved.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Could not save your profile photo.');
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setToast(error.message);
  };

  const username = profile?.username || '';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || '';
  const myVideos = useMemo(() => videos, [videos]);

  if (loading) return <div className="flex h-full items-center justify-center bg-black text-sm text-white/60">Loading profile…</div>;

  if (!user) return <div className="h-full overflow-y-auto bg-black px-5 pb-24 pt-8 text-white">
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">{authMode === 'login' ? 'Log in to ORNEX' : 'Create your account'}</h1>
      <p className="mb-6 text-sm text-white/60">Sign in to view your profile and videos.</p>
      <form onSubmit={(event) => void submitAuth(event)} className="space-y-3">
        <label className="block text-sm font-semibold" htmlFor="me-email">Email</label>
        <input id="me-email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="w-full border border-white/25 bg-black p-3 text-sm" placeholder="you@example.com" />
        <label className="block text-sm font-semibold" htmlFor="me-password">Password</label>
        <input id="me-password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} className="w-full border border-white/25 bg-black p-3 text-sm" placeholder="Password" />
        {authMessage && <p role="alert" className="text-sm text-[#D61E2B]">{authMessage}</p>}
        <button type="submit" disabled={authBusy} className="flex w-full items-center justify-center gap-2 bg-[#D61E2B] py-3 font-bold disabled:opacity-60">{authMode === 'login' ? <LogIn className="h-4 w-4"/> : <UserPlus className="h-4 w-4"/>}{authBusy ? 'Please wait…' : authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
      </form>
      <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthMessage(''); }} className="mt-4 w-full py-3 text-sm text-white underline">{authMode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Log In'}</button>
    </div>
  </div>;

  return <div className="ornex-me h-full overflow-y-auto bg-[#000000] pb-[120px] text-[#FFFFFF]">
    <header className="sticky top-0 z-10 grid h-12 grid-cols-[40px_1fr_40px] items-center bg-[#000000] px-4">
      <button type="button" aria-label="Sign out" onClick={() => void signOut()} className="flex h-10 w-10 items-center justify-center rounded-full"><LogOut className="h-5 w-5"/></button>
      <h1 className="truncate text-center text-base font-bold">@{username}</h1>
      <button type="button" aria-label="Edit profile" onClick={beginEdit} className="flex h-10 w-10 items-center justify-center rounded-full"><Pencil className="h-5 w-5"/></button>
    </header>

    <section className="px-5 pb-5 pt-5 text-center">
      <label className="relative mx-auto flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#D61E2B] bg-black text-2xl font-bold">
        {profile?.avatar_url ? <img src={profile.avatar_url} alt={`${displayName}'s profile`} className="h-full w-full object-cover"/> : <span>{displayName.slice(0, 2).toUpperCase() || 'U'}</span>}
        <input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadAvatar(event)}/>
      </label>
      {avatarError && <p role="alert" className="mx-auto mt-2 max-w-xs text-sm text-[#D61E2B]">{avatarError}</p>}
      <h2 className="mt-3 text-base font-bold">{displayName}</h2>
      <p className="mt-1 text-sm text-white/60">{user.email}</p>
      {profile?.bio && <p className="mx-auto mt-2 max-w-xs whitespace-pre-wrap text-sm leading-5 text-white/70">{profile.bio}</p>}
      <button type="button" onClick={beginEdit} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black"><Pencil className="h-4 w-4"/>Edit profile</button>
      <button type="button" onClick={() => void navigator.clipboard?.writeText(window.location.href)} className="ml-3 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white px-4 text-sm font-bold"><Share2 className="h-4 w-4"/>Share</button>
    </section>

    <div className="border-b border-white/20 py-3 text-center text-sm font-semibold">My Videos</div>
    {myVideos.length === 0 ? <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center"><Play className="mb-4 h-10 w-10 text-white/60"/><p className="text-sm text-white/60">No videos yet</p></div> : <div className="grid grid-cols-3 gap-px">{myVideos.map((video) => <VideoTile key={video.id} video={video}/>)}</div>}

    {editing && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4" onClick={() => setEditing(false)}>
      <form role="dialog" aria-modal="true" aria-label="Edit profile" onSubmit={(event) => void saveProfile(event)} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm border border-white/25 bg-black p-5">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">Edit profile</h2><button type="button" aria-label="Close" onClick={() => setEditing(false)} className="text-2xl">×</button></div>
        <label htmlFor="edit-profile-name" className="mb-1 block text-xs font-medium text-white/60">Name</label>
        <input id="edit-profile-name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={50} className="mb-4 w-full border border-white/25 bg-black px-3 py-2 text-sm"/>
        <label htmlFor="edit-profile-username" className="mb-1 block text-xs font-medium text-white/60">Username</label>
        <div className="mb-4 flex items-center border border-white/25 px-3"><span className="text-sm text-white/60">@</span><input id="edit-profile-username" value={editUsername} onChange={(event) => setEditUsername(event.target.value)} maxLength={24} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"/></div>
        <label htmlFor="edit-profile-bio" className="mb-1 block text-xs font-medium text-white/60">Bio</label>
        <textarea id="edit-profile-bio" value={editBio} onChange={(event) => setEditBio(event.target.value.slice(0, 160))} maxLength={160} rows={3} className="w-full resize-none border border-white/25 bg-black px-3 py-2 text-sm"/>
        <p className="mb-4 text-right text-xs text-white/50">{editBio.length}/160</p>
        {editError && <p role="alert" className="mb-3 text-sm text-[#D61E2B]">{editError}</p>}
        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 bg-[#D61E2B] py-3 text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : <><Check className="h-4 w-4"/>Save profile</>}</button>
      </form>
    </div>}
    {toast && <div role="status" className="fixed bottom-24 left-1/2 z-[100000] max-w-[90vw] -translate-x-1/2 border border-white/30 bg-black px-4 py-2 text-sm text-white">{toast}</div>}
  </div>;
}

function VideoTile({ video }: { video: VideoRecord }) {
  return <div className="relative aspect-[9/16] overflow-hidden bg-black">{video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.caption || video.title || 'Video thumbnail'} loading="lazy" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center"><Play className="h-8 w-8 text-white/60"/></div>}<div className="absolute bottom-1 left-1 flex items-center gap-1 text-xs font-semibold"><Play className="h-3 w-3"/>{video.title || 'Video'}</div></div>;
}
