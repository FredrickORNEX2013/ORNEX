import { supabase } from './supabase';

export type AppProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
};

export let currentAuthUser: any = null;

export async function getCurrentAuthUser() {
  const { data } = await supabase.auth.getUser();
  currentAuthUser = data.user ?? null;
  return currentAuthUser;
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentAuthUser();
  return user?.id ?? null;
}

export async function getOrCreateCurrentProfile(userId?: string): Promise<AppProfile | null> {
  const user = userId ? { id: userId } as any : await getCurrentAuthUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (data) return data as AppProfile;
  const { data: authUser } = await supabase.auth.getUser();
  const email = authUser.user?.email || '';
  const username = (email.split('@')[0] || 'user') + Math.floor(Math.random()*1000);
  const { data: created } = await supabase.from('profiles').insert({
    id: user.id, username, display_name: username, avatar_url: null,
  }).select().single();
  return (created as AppProfile) ?? null;
}

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { username: username.trim() } }
  });
  if (error) throw error;
  currentAuthUser = data.user;
  if (data.user && data.session) {
    await getOrCreateCurrentProfile(data.user.id);
  }
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentAuthUser = data.user;
  await getOrCreateCurrentProfile(data.user?.id);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentAuthUser = null;
    }
