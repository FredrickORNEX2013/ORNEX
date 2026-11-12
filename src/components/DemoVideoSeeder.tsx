import { useState } from 'react';
import { invalidateVideoCache } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';

const DEMO_PROFILE_ID = 'd3e00000-0000-4000-8000-000000000001';
const DEMO_PREFIX = 'demo-seed/ornex-v1/';

type DemoVideo = {
  title: string;
  caption: string;
  category: 'Comedy' | 'Drama' | 'Entertainment' | 'Live';
  url: string;
  duration: number;
  likes: number;
  views: number;
};

const DEMO_VIDEOS: DemoVideo[] = [
  { title: 'ORNEX Comedy Short 😂', caption: 'A quick laugh, made for the ORNEX Shorts feed.', category: 'Comedy', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4#t=0,45', duration: 45, likes: 120, views: 1800 },
  { title: 'ORNEX Comedy Short 😂', caption: 'Demo short: fun moments from the ORNEX community.', category: 'Comedy', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4#t=0,50', duration: 50, likes: 450, views: 5600 },
  { title: 'ORNEX Drama Short 🎭', caption: 'A dramatic sample clip for testing the full-bleed feed.', category: 'Drama', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4#t=0,55', duration: 55, likes: 890, views: 12400 },
  { title: 'ORNEX Drama Short 🎭', caption: 'More drama in under a minute. Demo video.', category: 'Drama', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4#t=0,48', duration: 48, likes: 160, views: 2300 },
  { title: 'ORNEX Entertainment Short ✨', caption: 'A sample clip to explore the ORNEX Shorts experience.', category: 'Entertainment', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,40', duration: 40, likes: 670, views: 9100 },
  { title: 'ORNEX Entertainment Short ✨', caption: 'Quick entertainment for your demo feed.', category: 'Entertainment', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4#t=0,58', duration: 58, likes: 980, views: 15100 },
  { title: 'ORNEX Live-Style Short 🔴', caption: 'Live-style demo clip. This is a sample video, not a live stream.', category: 'Live', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4#t=0,42', duration: 42, likes: 340, views: 4700 },
  { title: 'ORNEX Live-Style Short 🔴', caption: 'A second live-style sample for testing category filters.', category: 'Live', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4#t=20,60', duration: 40, likes: 1250, views: 20800 },
  { title: 'ORNEX Comedy Feature 😂', caption: 'Long-form demo video for Explore. Public sample footage.', category: 'Comedy', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: 596, likes: 2200, views: 31500 },
  { title: 'ORNEX Comedy Feature 😂', caption: 'A second long comedy demo for the Explore section.', category: 'Comedy', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', duration: 888, likes: 3200, views: 48200 },
  { title: 'ORNEX Drama Feature 🎭', caption: 'Long-form drama sample for testing Explore.', category: 'Drama', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', duration: 734, likes: 1800, views: 26700 },
  { title: 'ORNEX Entertainment Feature ✨', caption: 'Long-form entertainment demo. Sample video hosted publicly.', category: 'Entertainment', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: 596, likes: 4100, views: 62400 },
];

export async function seedDemoVideos(): Promise<number> {
  const { data: existing, error: existingError } = await supabase
    .from('videos')
    .select('storage_path')
    .like('storage_path', `${DEMO_PREFIX}%`);
  if (existingError) throw existingError;

  const existingPaths = new Set((existing || []).map((video) => video.storage_path as string));
  const missing = DEMO_VIDEOS.flatMap((video, index) => {
    const storagePath = `${DEMO_PREFIX}${String(index + 1).padStart(2, '0')}`;
    if (existingPaths.has(storagePath)) return [];
    return [{
      title: video.title,
      caption: video.caption,
      category: video.category,
      url: video.url,
      storage_path: storagePath,
      thumbnail_url: `https://picsum.photos/seed/ornex${index + 1}/720/1280`,
      orientation: 'portrait',
      user_id: DEMO_PROFILE_ID,
      likes: video.likes,
      views: video.views,
      status: 'approved',
      type: video.duration <= 60 ? 'SHORT' : 'LONG',
      duration_seconds: video.duration,
      is_live: false,
      is_channel: false,
      is_ad: false,
    }];
  });

  if (!missing.length) return 0;

  const { data: demoProfile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', 'ornex_demo')
    .maybeSingle();
  if (profileLookupError) throw profileLookupError;

  let profileId = demoProfile?.id as string | undefined;
  if (!profileId) {
    const { data: createdProfile, error: profileInsertError } = await supabase
      .from('profiles')
      .insert({ id: DEMO_PROFILE_ID, username: 'ornex_demo', display_name: 'ORNEX Demo' })
      .select('id')
      .single();
    if (profileInsertError) throw profileInsertError;
    profileId = createdProfile.id as string;
  }

  const rows = missing.map((video) => ({ ...video, user_id: profileId }));
  const { error: insertError } = await supabase.from('videos').insert(rows);
  if (insertError) throw insertError;
  invalidateVideoCache();
  return rows.length;
}

export default function DemoVideoSeeder() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const seed = async () => {
    setBusy(true);
    setMessage('');
    try {
      const count = await seedDemoVideos();
      setMessage(count ? `Added ${count} demo videos.` : 'Demo videos are already seeded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add demo videos.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="absolute left-3 top-14 z-30 flex max-w-[calc(100%-5rem)] flex-col items-start gap-1">
    <button type="button" onClick={() => void seed()} disabled={busy} className="border border-white/50 bg-black px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
      {busy ? 'Adding demo videos…' : 'Seed demo videos'}
    </button>
    {message && <span role="status" className="border border-white/30 bg-black px-2 py-1 text-[11px] text-white">{message}</span>}
  </div>;
}
