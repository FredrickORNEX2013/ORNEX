import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ProfileRecord } from '@/lib/supabase';

let currentAuthUser: User | null = null;

/** Keep the in-memory identity in sync with Supabase Auth; never synthesize user IDs. */
export function setCurrentAuthUser(user: User | null): void {
  currentAuthUser = user;
}

export async function getCurrentAuthUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  currentAuthUser = data.user;
  return data.user;
}

export async function signUp(email: string, password: string, username: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim(), display_name: (displayName || username).trim() } },
  });
  if (error) throw error;
  currentAuthUser = data.user;
  if (data.user && data.session) {
    await getOrCreateCurrentProfile(data.user);
  }
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentAuthUser = data.user;
  await getOrCreateCurrentProfile(data.user);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentAuthUser = null;
}

export async function getOrCreateCurrentProfile(authUser?: User | null): Promise<ProfileRecord | null> {
  const user = authUser === undefined ? await getCurrentAuthUser() : authUser;
  if (!user) return null;

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing as ProfileRecord;

  const rawUsername = String(user.user_metadata?.username || user.email?.split('@')[0] || 'user');
  const username = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
  const displayName = String(user.user_metadata?.display_name || rawUsername).slice(0, 50);

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        username: `${username}_${user.id.slice(0, 6)}`,
        display_name: displayName,
        avatar_color: '#CC0000',
        role: 'user',
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();
  if (createError) throw createError;
  return created as ProfileRecord;
}

/**
 * Compatibility for existing tab components. This only returns the ID of the
 * signed-in Supabase Auth user and returns an empty string while signed out.
 * It never creates or persists a pseudo-user.
 */
export function getOrCreateUserId(): string {
  return currentAuthUser?.id ?? '';
}
