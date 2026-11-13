import { supabase } from './supabase';

const ID_KEY = 'ornex_guest_id';
const PROFILE_KEY = 'ornex_guest_profile';
export type AppProfile = { id: string; username: string; display_name: string; avatar_url?: string | null };
export type GuestProfile = AppProfile & { bio?: string };

function readProfile(): GuestProfile | null {
  try { const raw = localStorage.getItem(PROFILE_KEY); return raw ? JSON.parse(raw) as GuestProfile : null; } catch { return null; }
}
function writeProfile(profile: GuestProfile) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage may be disabled */ } }
export function getGuestProfile(): GuestProfile {
  let id = '';
  try { id = localStorage.getItem(ID_KEY) || ''; } catch { /* use in-memory identity */ }
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try { localStorage.setItem(ID_KEY, id); } catch { /* ignore */ }
  }
  const existing = readProfile();
  if (existing?.id === id) return existing;
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const profile = { id, username: `Guest_${suffix}`, display_name: `Guest_${suffix}`, avatar_url: null, bio: '' };
  writeProfile(profile);
  return profile;
}
export function saveGuestProfile(updates: Partial<GuestProfile>): GuestProfile {
  const profile = { ...getGuestProfile(), ...updates };
  writeProfile(profile);
  void supabase.from('profiles').upsert({ id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url, bio: profile.bio || '' }, { onConflict: 'id' });
  return profile;
}
export async function getCurrentUserId(): Promise<string> { return getGuestProfile().id; }
export async function getOrCreateCurrentProfile(): Promise<GuestProfile> { return getGuestProfile(); }
