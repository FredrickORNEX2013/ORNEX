import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Video,
  Megaphone,
  Users,
  BarChart3,
  LogOut,
  Check,
  X,
  Trash2,
  Plus,
  Loader2,
  Eye,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Shield,
  Lock,
  ArrowLeft,
  Power,
  Ban,
  Settings as SettingsIcon,
  Youtube,
  Save,
  Palette,
} from 'lucide-react';
import {
  adminLogin,
  adminLogout,
  getAdminSession,
  adminOps,
  type AdminRole,
  type AdminSession,
} from '@/lib/admin';
import OrnexLogo from '@/components/OrnexLogo';

type AdminView = 'dashboard' | 'videos' | 'ads' | 'admins' | 'analytics' | 'settings' | 'youtube' | 'pending' | 'flagged';

export default function AdminPanel() {
  const [session, setSession] = useState<AdminSession | null>(() => getAdminSession());
  const [view, setView] = useState<AdminView>('dashboard');

  const handleLogout = async () => {
    await adminLogout();
    setSession(null);
  };

  if (!session) {
    // Direct access via localStorage flag — no email form needed
    if (localStorage.getItem('ornex_is_admin') === 'true') {
      const directSession: AdminSession = { email: 'fredrick2013@proton.me', role: 'owner' as AdminRole };
      setSession(directSession);
      return null;
    }
    return <AdminLogin onLogin={(s) => setSession(s)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <a
            href="#/"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5 text-black" />
          </a>
          <OrnexLogo size={22} />
          <span className="rounded-md bg-black px-2 py-0.5 text-xs font-bold text-white">ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-black">{session.email}</p>
            <p className="text-[10px] capitalize text-neutral-500">{session.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 active:scale-95"
          >
            <LogOut className="h-5 w-5 text-black" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col border-r border-neutral-200 bg-white p-3 md:flex">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={Video} label="Pending" active={view === 'pending'} onClick={() => setView('pending')} />
          <NavItem icon={Video} label="Videos" active={view === 'videos'} onClick={() => setView('videos')} />
          <NavItem icon={Megaphone} label="Ads" active={view === 'ads'} onClick={() => setView('ads')} />
          <NavItem icon={Users} label="Admins" active={view === 'admins'} onClick={() => setView('admins')} />
          <NavItem icon={Youtube} label="YouTube" active={view === 'youtube'} onClick={() => setView('youtube')} />
          <NavItem icon={AlertCircle} label="Flagged" active={view === 'flagged'} onClick={() => setView('flagged')} />
          <NavItem icon={SettingsIcon} label="App Settings" active={view === 'settings'} onClick={() => setView('settings')} />
          <NavItem icon={BarChart3} label="Analytics" active={view === 'analytics'} onClick={() => setView('analytics')} />
        </nav>

        {/* Mobile tab bar */}
        <div className="flex w-full flex-col">
          <div className="flex gap-1 border-b border-neutral-200 bg-white px-2 py-2 md:hidden">
            <MobileTab icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <MobileTab icon={Video} label="Pending" active={view === 'pending'} onClick={() => setView('pending')} />
            <MobileTab icon={Video} label="Videos" active={view === 'videos'} onClick={() => setView('videos')} />
            <MobileTab icon={Megaphone} label="Ads" active={view === 'ads'} onClick={() => setView('ads')} />
            <MobileTab icon={Users} label="Admins" active={view === 'admins'} onClick={() => setView('admins')} />
            <MobileTab icon={Youtube} label="YouTube" active={view === 'youtube'} onClick={() => setView('youtube')} />
            <MobileTab icon={AlertCircle} label="Flagged" active={view === 'flagged'} onClick={() => setView('flagged')} />
            <MobileTab icon={SettingsIcon} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
            <MobileTab icon={BarChart3} label="Stats" active={view === 'analytics'} onClick={() => setView('analytics')} />
          </div>

          <main className="flex-1 p-4 md:p-6">
            {view === 'dashboard' && <DashboardView role={session.role} />}
            {view === 'videos' && <VideosView role={session.role} />}
            {view === 'ads' && <AdsView role={session.role} />}
            {view === 'admins' && <AdminsView role={session.role} currentEmail={session.email} />}
            {view === 'youtube' && <YoutubeView />}
            {view === 'settings' && <SettingsView />}
            {view === 'analytics' && <AnalyticsView />}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- Login ---------- */

function AdminLogin({ onLogin }: { onLogin: (s: AdminSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await adminLogin(email, password);
    if (result.success && result.role) {
      onLogin({ email, role: result.role });
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <OrnexLogo size={32} />
          <h1 className="mt-4 text-xl font-bold text-black">Admin Panel</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to manage ORNEX</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none"
              placeholder="admin@ornex.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-800 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        <a
          href="#/"
          className="mt-4 block text-center text-xs text-neutral-400 hover:text-neutral-600"
        >
          Back to ORNEX
        </a>
      </div>
    </div>
  );
}

/* ---------- Nav Items ---------- */

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-black text-white'
          : disabled
            ? 'cursor-not-allowed text-neutral-300'
            : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function MobileTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors ${
        active ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ---------- Dashboard ---------- */

type Stats = {
  totalVideos?: number;
  totalAds?: number;
  pendingApprovals?: number;
  totalAdmins?: number;
  adRevenue?: number;
  totalRevenue?: number;
  totalPayouts?: number;
  admins?: Array<{ id: string; email: string; role: string; created_at: string }>;
  appStats?: Record<string, number>;
};

function DashboardView({ role }: { role: AdminRole }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await adminOps('stats');
    if (ok && data) setStats(data as Stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-black">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Video} label="Total Videos" value={stats?.totalVideos ?? 0} color="bg-blue-500" />
        <StatCard icon={AlertCircle} label="Pending Approvals" value={stats?.pendingApprovals ?? 0} color="bg-neutral-700" />
        <StatCard icon={Megaphone} label="Active Ads" value={stats?.totalAds ?? 0} color="bg-green-500" />
        <StatCard icon={Users} label="Admins" value={stats?.totalAdmins ?? 0} color="bg-purple-500" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`} color="bg-emerald-500" />
        <StatCard icon={TrendingUp} label="Ad Revenue" value={`$${(stats?.adRevenue ?? 0).toFixed(2)}`} color="bg-teal-500" />
        <StatCard icon={DollarSign} label="Total Payouts" value={`$${(stats?.totalPayouts ?? 0).toFixed(2)}`} color="bg-red-500" />
        <StatCard icon={Shield} label="Your Role" value={role} color="bg-black" />
      </div>

      {stats?.pendingApprovals && stats.pendingApprovals > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-neutral-700" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-black">
              {stats.pendingApprovals} video{stats.pendingApprovals > 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-xs text-neutral-600">Go to the Videos tab to review them.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Video; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-black">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

/* ---------- Videos View ---------- */

type AdminVideo = {
  id: string;
  title: string | null;
  url: string;
  caption: string | null;
  category: string | null;
  orientation: string;
  status: string;
  nsfw_flagged: boolean;
  nsfw_reason: string | null;
  likes: number;
  views: number;
  created_at: string;
  user_id: string | null;
};

function VideosView({ role }: { role: AdminRole }) {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await adminOps('list-videos', { status: filter });
    if (ok && data) setVideos((data as { videos: AdminVideo[] }).videos);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (action: string, videoId: string) => {
    setActionLoading(videoId);
    await adminOps(action, { videoId });
    await load();
    setActionLoading(null);
  };

  const FILTERS = ['pending', 'approved', 'rejected', 'banned', 'all'];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-black">Videos</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-black text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : videos.length === 0 ? (
        <EmptyState icon={Video} label={`No ${filter} videos`} />
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div key={video.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <video
                src={video.url}
                preload="metadata"
                muted
                className="h-20 w-32 shrink-0 rounded-lg bg-neutral-100 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-black">{video.title || 'Untitled'}</p>
                <p className="truncate text-xs text-neutral-500">{video.caption || 'No caption'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={video.status} />
                  {video.category && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                      {video.category}
                    </span>
                  )}
                  {video.nsfw_flagged && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      NSFW: {video.nsfw_reason}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400">
                    {video.views} views · {video.likes} likes
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {video.status === 'pending' && role !== 'mod' && (
                    <>
                      <ActionButton icon={Check} label="Approve" color="green" loading={actionLoading === video.id} onClick={() => handleAction('approve-video', video.id)} />
                      <ActionButton icon={X} label="Reject" color="neutral" loading={actionLoading === video.id} onClick={() => handleAction('reject-video', video.id)} />
                    </>
                  )}
                  <ActionButton icon={Ban} label="Ban" color="red" loading={actionLoading === video.id} onClick={() => handleAction('ban-video', video.id)} />
                  {role !== 'mod' && (
                    <ActionButton icon={Trash2} label="Delete" color="neutral" loading={actionLoading === video.id} onClick={() => handleAction('delete-video', video.id)} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-neutral-200 text-neutral-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-yellow-100 text-yellow-700',
    banned: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold capitalize ${colors[status] || 'bg-neutral-100 text-neutral-600'}`}>
      {status}
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  color,
  loading,
  onClick,
}: {
  icon: typeof Check;
  label: string;
  color: 'green' | 'red' | 'neutral';
  loading: boolean;
  onClick: () => void;
}) {
  const colors = {
    green: 'bg-green-500 text-white hover:bg-green-600',

    red: 'bg-red-500 text-white hover:bg-red-600',
    neutral: 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}

/* ---------- Ads View ---------- */

type AdminAd = {
  id: string;
  brand_name: string;
  video_url: string;
  learn_more_url: string | null;
  skip_after_seconds: number;
  impressions: number;
  clicks: number;
  active: boolean;
  created_at: string;
};

function AdsView({ role }: { role: AdminRole }) {
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [learnMoreUrl, setLearnMoreUrl] = useState('');
  const [skipAfter, setSkipAfter] = useState(5);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await adminOps('list-ads');
    if (ok && data) setAds((data as { ads: AdminAd[] }).ads);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const { ok, error: err } = await adminOps('create-ad', {
      brandName,
      videoUrl,
      learnMoreUrl,
      skipAfter,
    });
    if (ok) {
      setShowCreate(false);
      setBrandName('');
      setVideoUrl('');
      setLearnMoreUrl('');
      setSkipAfter(5);
      await load();
    } else {
      setError(err || 'Failed to create ad');
    }
    setCreating(false);
  };

  const handleToggle = async (adId: string) => {
    await adminOps('toggle-ad', { adId });
    await load();
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Delete this ad?')) return;
    await adminOps('delete-ad', { adId });
    await load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Ads</h1>
        {role !== 'mod' && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Ad
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-black">Create Sponsored Ad</h2>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <div className="space-y-3">
            <Input label="Brand name" value={brandName} onChange={setBrandName} placeholder="e.g. OX Energy" />
            <Input label="Video URL" value={videoUrl} onChange={setVideoUrl} placeholder="https://…" />
            <Input label="Learn More URL (optional)" value={learnMoreUrl} onChange={setLearnMoreUrl} placeholder="https://…" />
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Skip after (seconds)</label>
              <input
                type="number"
                value={skipAfter}
                onChange={(e) => setSkipAfter(Number(e.target.value))}
                min={1}
                max={30}
                className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !brandName || !videoUrl}
                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Ad
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : ads.length === 0 ? (
        <EmptyState icon={Megaphone} label="No ads yet" />
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <video
                src={ad.video_url}
                preload="metadata"
                muted
                className="h-20 w-32 shrink-0 rounded-lg bg-neutral-100 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-black">{ad.brand_name}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ad.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {ad.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                {ad.learn_more_url && <p className="truncate text-xs text-blue-500">{ad.learn_more_url}</p>}
                <p className="mt-1 text-xs text-neutral-500">
                  {ad.impressions} impressions · {ad.clicks} clicks · skip after {ad.skip_after_seconds}s
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleToggle(ad.id)}
                    className="flex items-center gap-1 rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300"
                  >
                    <Power className="h-3 w-3" />
                    {ad.active ? 'Pause' : 'Activate'}
                  </button>
                  {role !== 'mod' && (
                    <button
                      onClick={() => handleDelete(ad.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Admins View ---------- */

type AdminUser = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

function AdminsView({ role, currentEmail }: { role: AdminRole; currentEmail: string }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [bans, setBans] = useState<Array<{ banned_email: string; banned_by: string; reason: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('mod');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await adminOps('list-admins');
    if (ok && data) {
      const result = data as { admins: AdminUser[]; bans: Array<{ banned_email: string; banned_by: string; reason: string | null }> };
      setAdmins(result.admins || []);
      setBans(result.bans || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const { ok, error: err } = await adminOps('create-admin', { email, password, newRole });
    if (ok) {
      setShowCreate(false);
      setEmail('');
      setPassword('');
      setNewRole('mod');
      await load();
    } else {
      setError(err || 'Failed to create admin');
    }
    setCreating(false);
  };

  const handleRemove = async (adminEmail: string) => {
    if (!confirm(`Remove ${adminEmail} from admins?`)) return;
    await adminOps('remove-admin', { email: adminEmail });
    await load();
  };

  const handleBan = async (adminEmail: string) => {
    const reason = prompt(`Ban ${adminEmail} permanently? Reason:`);
    if (reason === null) return;
    await adminOps('ban-admin', { email: adminEmail, reason: reason || 'Banned by admin' });
    await load();
  };

  const handleUnban = async (adminEmail: string) => {
    if (!confirm(`Unban ${adminEmail}?`)) return;
    await adminOps('unban-admin', { email: adminEmail });
    await load();
  };

  if (role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Lock className="mb-3 h-10 w-10 text-neutral-300" />
        <p className="text-sm font-medium text-black">Owner access required</p>
        <p className="mt-1 text-xs text-neutral-500">Only owners can manage admins.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Admins</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-black">Create New Admin</h2>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <div className="space-y-3">
            <Input label="Email" value={email} onChange={setEmail} placeholder="admin@ornex.com" />
            <Input label="Password" value={password} onChange={setPassword} placeholder="Minimum 8 characters" type="password" />
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Role</label>
              <div className="flex gap-2">
                {(['owner', 'full', 'mod'] as AdminRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewRole(r)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      newRole === r ? 'bg-black text-white' : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {newRole === 'owner' && 'Full access including admin management'}
                {newRole === 'full' && 'Can approve/reject videos, manage ads, delete content'}
                {newRole === 'mod' && 'Can ban videos, view analytics — no approvals or deletions'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !email || !password}
                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Admin
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => {
            const isBanned = bans.some((b) => b.banned_email === admin.email);
            return (
            <div key={admin.id} className={`flex items-center gap-3 rounded-xl border p-3 ${isBanned ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-white'}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isBanned ? 'bg-red-500' : 'bg-black'}`}>
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-black">{admin.email}</p>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold capitalize ${admin.role === 'owner' ? 'bg-purple-100 text-purple-700' : admin.role === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'}`}>
                    {admin.role}
                  </span>
                  {isBanned && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">BANNED</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {admin.email !== currentEmail && !isBanned && (
                  <button
                    onClick={() => handleBan(admin.email)}
                    className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600"
                  >
                    <Ban className="h-3 w-3" />
                    Ban
                  </button>
                )}
                {isBanned && role === 'owner' && (
                  <button
                    onClick={() => handleUnban(admin.email)}
                    className="flex items-center gap-1 rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300"
                  >
                    <Shield className="h-3 w-3" />
                    Unban
                  </button>
                )}
                {admin.role !== 'owner' && role === 'owner' && !isBanned && (
                  <button
                    onClick={() => handleRemove(admin.email)}
                    className="flex items-center gap-1 rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Analytics View ---------- */

function AnalyticsView() {
  const [data, setData] = useState<{
    totalImpressions: number;
    totalClicks: number;
    totalSkips: number;
    ctr: string;
    ads: Array<{ id: string; brand_name: string; impressions: number; clicks: number; ctr: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { ok, data: result } = await adminOps('analytics');
      if (ok && result) setData(result as typeof data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={BarChart3} label="No analytics data" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-black">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Eye} label="Impressions" value={data.totalImpressions} color="bg-blue-500" />
        <StatCard icon={MousePointerClick} label="Clicks" value={data.totalClicks} color="bg-green-500" />
        <StatCard icon={X} label="Skips" value={data.totalSkips} color="bg-neutral-700" />
        <StatCard icon={TrendingUp} label="CTR" value={`${data.ctr}%`} color="bg-purple-500" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-black">Per-ad performance</h2>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-black">Brand</th>
              <th className="px-4 py-2.5 text-right font-semibold text-black">Impressions</th>
              <th className="px-4 py-2.5 text-right font-semibold text-black">Clicks</th>
              <th className="px-4 py-2.5 text-right font-semibold text-black">CTR</th>
            </tr>
          </thead>
          <tbody>
            {data.ads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No ad data yet</td>
              </tr>
            ) : (
              data.ads.map((ad) => (
                <tr key={ad.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-black">{ad.brand_name}</td>
                  <td className="px-4 py-2.5 text-right text-neutral-700">{ad.impressions}</td>
                  <td className="px-4 py-2.5 text-right text-neutral-700">{ad.clicks}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-black">{ad.ctr}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- App Settings View ---------- */

function SettingsView() {
  const [appName, setAppName] = useState('ORNEX');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [accentColor, setAccentColor] = useState('#ffffff');
  const [logoIcon, setLogoIcon] = useState('play');
  const [showTabs, setShowTabs] = useState<string[]>(['foryou', 'explore', 'post', 'inbox', 'me']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALL_TABS = [
    { key: 'foryou', label: 'For You' },
    { key: 'explore', label: 'Explore' },
    { key: 'post', label: 'Post' },
    { key: 'inbox', label: 'Inbox' },
    { key: 'me', label: 'Me' },
  ];

  const ICON_OPTIONS = ['play', 'video', 'zap', 'film', 'clapperboard', 'radio'];

  useEffect(() => {
    (async () => {
      const { ok, data } = await adminOps('get-app-settings');
      if (ok && data) {
        const settings = data as { settings: Record<string, { appName?: string; primaryColor?: string; accentColor?: string; logoIcon?: string; showTabs?: string[] }> };
        const cfg = settings.settings?.app_config;
        if (cfg) {
          setAppName(cfg.appName || 'ORNEX');
          setPrimaryColor(cfg.primaryColor || '#000000');
          setAccentColor(cfg.accentColor || '#ffffff');
          setLogoIcon(cfg.logoIcon || 'play');
          setShowTabs(cfg.showTabs || ALL_TABS.map((t) => t.key));
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { ok, error: err } = await adminOps('update-app-setting', {
      key: 'app_config',
      value: { appName, primaryColor, accentColor, logoIcon, showTabs },
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(err || 'Failed to save');
    }
    setSaving(false);
  };

  const toggleTab = (tabKey: string) => {
    setShowTabs((prev) =>
      prev.includes(tabKey) ? prev.filter((t) => t !== tabKey) : [...prev, tabKey]
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-black">App Settings</h1>

      <div className="max-w-lg space-y-6">
        {/* App Name */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-black">App Name</label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">Shown in header and throughout the app</p>
        </div>

        {/* Colors */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-black" />
            <h2 className="text-sm font-semibold text-black">Colors</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-neutral-300"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-neutral-300"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo Icon */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-black">Logo Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setLogoIcon(icon)}
                className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  logoIcon === icon ? 'bg-black text-white' : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Tab visibility */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-black">Visible Tabs</label>
          <p className="mb-3 text-xs text-neutral-500">Toggle which tabs appear in the bottom navigation</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => toggleTab(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  showTabs.includes(tab.key) ? 'bg-black text-white' : 'border border-neutral-200 text-neutral-400 hover:bg-neutral-50'
                }`}
              >
                {showTabs.includes(tab.key) && <Check className="mr-1 inline h-3 w-3" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-800 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

/* ---------- YouTube View ---------- */

type YTChannel = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
};

function YoutubeView() {
  const [apiKey, setApiKey] = useState('');
  const [channelIds, setChannelIds] = useState('');
  const [channels, setChannels] = useState<YTChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!apiKey || !channelIds) return;
    setLoading(true);
    setError(null);
    const ids = channelIds.split(',').map((s) => s.trim()).filter(Boolean);
    const { ok, data, error: err } = await adminOps('fetch-youtube-channels', { apiKey, channelIds: ids });
    if (ok && data) {
      setChannels((data as { channels: YTChannel[] }).channels);
    } else {
      setError(err || 'Failed to fetch');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-black">YouTube Channels</h1>

      <div className="max-w-lg space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <Youtube className="h-5 w-5 text-black" />
            <h2 className="text-sm font-semibold text-black">Fetch Channel Data</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">YouTube API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Channel IDs (comma-separated)</label>
              <input
                type="text"
                value={channelIds}
                onChange={(e) => setChannelIds(e.target.value)}
                placeholder="UC_x5XG1VI..."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-500">Find channel IDs in YouTube channel URLs</p>
            </div>
            <button
              onClick={handleFetch}
              disabled={loading || !apiKey || !channelIds}
              className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
              Fetch Channels
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {channels.length > 0 && (
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                {ch.thumbnail && (
                  <img src={ch.thumbnail} alt={ch.title} className="h-16 w-16 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black">{ch.title}</p>
                  <p className="truncate text-xs text-neutral-500">{ch.description}</p>
                  <div className="mt-1 flex gap-3 text-[10px] text-neutral-400">
                    <span>{ch.subscriberCount} subs</span>
                    <span>{ch.videoCount} videos</span>
                    <span>{ch.viewCount} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Shared helpers ---------- */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: typeof Video; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Icon className="mb-3 h-10 w-10 text-neutral-300" />
      <p className="text-sm font-medium text-black">{label}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-black">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
      />
    </div>
  );
}
