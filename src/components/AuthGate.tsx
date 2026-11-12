import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setCurrentAuthUser, signInWithPassword, signUp, signOut } from '@/lib/user';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      const authenticatedUser = error ? null : data.user;
      setCurrentAuthUser(authenticatedUser);
      setUser(authenticatedUser);
      setChecking(false);
    };
    void loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authenticatedUser = session?.user ?? null;
      setCurrentAuthUser(authenticatedUser);
      setUser(authenticatedUser);
      setChecking(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-black text-white">Loading ORNEX…</main>;
  }
  if (!user) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'sign-up') {
        const result = await signUp(email, password, username, displayName);
        if (!result.session) setNotice('Check your email to confirm your account, then sign in.');
      } else {
        await signInWithPassword(email, password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-black px-5 text-white">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#111] p-6">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tight">ORNEX</div>
          <p className="mt-2 text-sm text-neutral-400">{mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}</p>
        </div>
        {mode === 'sign-up' && <>
          <label className="block text-sm">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className={inputClass} /></label>
          <label className="block text-sm">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></label>
        </>}
        <label className="block text-sm">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={inputClass} /></label>
        <label className="block text-sm">Password<input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} className={inputClass} /></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}
        <button disabled={busy} className="w-full rounded-full bg-[#FF2D2D] py-3 font-bold disabled:opacity-50">{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="w-full py-2 text-sm text-neutral-400" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice(''); }}>
          {mode === 'sign-in' ? 'New to ORNEX? Create an account' : 'Already registered? Sign in'}
        </button>
      </form>
    </main>
  );
}

const inputClass = 'mt-1 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#FF2D2D]';
