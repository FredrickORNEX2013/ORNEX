import { supabase } from '@/lib/supabase';

export type AdminRole = 'owner' | 'full' | 'mod';

export type AdminSession = {
  email: string;
  role: AdminRole;
};

const ADMIN_SESSION_KEY = 'ornex_admin_session';
const LOGIN_ATTEMPTS_KEY = 'ornex_login_attempts';

export async function adminLogin(email: string, password: string): Promise<{ success: boolean; error?: string; role?: AdminRole }> {
  // Check local login attempt counter
  const attempts = getLoginAttempts(email);
  if (attempts >= 5) {
    return { success: false, error: 'Too many failed attempts. This account is now blocked. Contact another admin to unban.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    recordLoginAttempt(email, false);
    const attemptsAfter = getLoginAttempts(email);
    if (attemptsAfter >= 5) {
      return { success: false, error: 'Account locked after 5 failed attempts. Contact another admin to unban.' };
    }
    return { success: false, error: `Invalid credentials. ${5 - attemptsAfter} attempt(s) remaining.` };
  }

  // Check if user is an admin via edge function
  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    },
    body: JSON.stringify({ action: 'whoami' }),
  });

  if (!res.ok) {
    await supabase.auth.signOut();
    recordLoginAttempt(email, false);
    const result = await res.json().catch(() => ({}));
    return { success: false, error: result.error || 'Not an admin account' };
  }

  const result = await res.json();
  if (!result.isAdmin) {
    await supabase.auth.signOut();
    recordLoginAttempt(email, false);
    return { success: false, error: result.error || 'Not an admin account' };
  }

  // Success — clear attempts
  clearLoginAttempts(email);

  const session: AdminSession = { email, role: result.role as AdminRole };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return { success: true, role: result.role as AdminRole };
}

function getLoginAttempts(email: string): number {
  const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw) as Record<string, number>;
    return data[email] || 0;
  } catch {
    return 0;
  }
}

function recordLoginAttempt(email: string, _success: boolean) {
  const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  let data: Record<string, number> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  data[email] = (data[email] || 0) + 1;
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
}

function clearLoginAttempts(email: string) {
  const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as Record<string, number>;
    delete data[email];
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export async function adminLogout(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminSession(): AdminSession | null {
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  if (localStorage.getItem('ornex_is_admin') === 'true') return true;
  return getAdminSession() !== null;
}

export async function adminOps(action: string, payload: Record<string, unknown> = {}): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, error: 'Not authenticated' };

  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const result = await res.json();
  if (!res.ok) return { ok: false, error: result.error || 'Request failed' };
  return { ok: true, data: result };
}
