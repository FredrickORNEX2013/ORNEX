import { useEffect, useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { supabase, type VideoRecord } from '@/lib/supabase';
import { publishVideo } from '@/lib/hooks';
import { getCurrentUserId } from '@/lib/user';

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;
type PostTabProps = { onPosted: (isShort: boolean) => void };
type ExternalVideo = { platform: 'youtube' | 'vimeo'; id: string; url: string };

function parseExternalVideo(value: string): ExternalVideo | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[\w-]{11}$/.test(id) ? { platform: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? { platform: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      return id ? { platform: 'vimeo', id, url: `https://vimeo.com/${id}` } : null;
    }
  } catch { return null; }
  return null;
}

export default function PostTab({ onPosted }: PostTabProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Entertainment');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  const chooseVideo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Choose a video file.'); return; }
    setVideo(file);
    setExternalUrl('');
    setDuration(null);
    setVideoUrl(URL.createObjectURL(file));
    setError('');
    setDone(false);
  };
  const setLink = (value: string) => {
    setExternalUrl(value);
    setVideo(null);
    setVideoUrl('');
    setDuration(null);
    setError(value.trim() && !parseExternalVideo(value) ? 'Paste a valid YouTube or Vimeo video URL.' : '');
    setDone(false);
  };
  const upload = async () => {
    const external = parseExternalVideo(externalUrl);
    if (!video && !external) { setError('Choose a video file or paste a valid YouTube/Vimeo link.'); return; }
    if (video && (!duration || !Number.isFinite(duration))) { setError('Wait for the video preview to finish loading before posting.'); return; }
    if (!title.trim()) { setError('Enter a title.'); return; }
    const userId = await getCurrentUserId();
    if (!userId) { setError('Sign in before posting.'); return; }

    setBusy(true);
    setError('');
    try {
      let storagePath: string;
      let publicVideoUrl: string;
      if (external) {
        storagePath = `${external.platform}/${external.id}`;
        publicVideoUrl = external.url;
      } else {
        const safeName = video!.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `uploads/${userId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('videos').upload(storagePath, video!, { contentType: video!.type || 'video/mp4' });
        if (uploadError) throw uploadError;
        publicVideoUrl = supabase.storage.from('videos').getPublicUrl(storagePath).data.publicUrl;
      }
      const row = {
        user_id: userId,
        title: title.trim(),
        caption: caption.trim() || null,
        category,
        url: publicVideoUrl,
        storage_path: storagePath,
        orientation: 'portrait' as const,
        likes: 0,
        views: 0,
        duration_seconds: external ? 60 : Math.ceil(duration!),
        type: 'SHORT',
        is_live: false,
        status: 'approved',
        vimeo_url: external?.platform === 'vimeo' ? external.url : null,
        youtube_url: external?.platform === 'youtube' ? external.url : null,
      };
      const { data, error: insertError } = await supabase.from('videos').insert(row).select('*').single();
      if (insertError) throw insertError;
      publishVideo(data as VideoRecord);
      setDone(true);
      setVideo(null); setVideoUrl(''); setDuration(null); setTitle(''); setCaption(''); setExternalUrl('');
      if (videoInput.current) videoInput.current.value = '';
      onPosted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not publish your video.');
    } finally { setBusy(false); }
  };

  return <div className="h-full overflow-y-auto bg-black px-4 pb-24 pt-5 text-white">
    <h1 className="mb-1 text-2xl font-bold">Create a post</h1><p className="mb-5 text-sm text-white/60">Share a video with ORNEX.</p>
    {done && <p role="status" className="mb-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-[#D61E2B]"/>Post published and added to your videos.</p>}
    <label htmlFor="external-video-url" className="mb-2 block text-sm font-semibold">YouTube or Vimeo link</label>
    <input id="external-video-url" value={externalUrl} onChange={(event) => setLink(event.target.value)} placeholder="https://youtube.com/shorts/… or https://vimeo.com/…" className="mb-4 w-full rounded-lg border border-white/25 bg-black p-3 text-sm outline-none focus:border-[#D61E2B]"/>
    <div className="mb-4 flex items-center gap-3 text-xs text-white/45"><span className="h-px flex-1 bg-white/15"/>OR<span className="h-px flex-1 bg-white/15"/></div>
    <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(event) => chooseVideo(event.target.files?.[0])}/>
    {!video ? <button type="button" onClick={() => videoInput.current?.click()} className="mb-5 flex w-full items-center gap-4 rounded-xl border border-white/20 p-5 text-left"><Upload className="h-8 w-8 text-[#D61E2B]"/><span><span className="block font-semibold">Upload from your phone</span><span className="mt-1 block text-xs text-white/55">Select a video from your device.</span></span></button> : <div className="mb-5">{videoUrl && <video src={videoUrl} controls playsInline onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} className="mb-3 max-h-64 w-full rounded-lg bg-neutral-900"/>}<button type="button" onClick={() => videoInput.current?.click()} className="text-sm underline">Choose a different video</button></div>}
    <label htmlFor="post-title" className="mb-1 block text-sm font-semibold">Title</label><input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Add a title" className="mb-4 w-full rounded-lg border border-white/25 bg-black p-3 text-sm outline-none focus:border-[#D61E2B]"/>
    <label htmlFor="post-category" className="mb-1 block text-sm font-semibold">Category</label><select id="post-category" value={category} onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])} className="mb-4 w-full rounded-lg border border-white/25 bg-black p-3 text-sm"><option value="Comedy">Comedy</option><option value="Drama">Drama</option><option value="Entertainment">Entertainment</option></select>
    <label htmlFor="post-description" className="mb-1 block text-sm font-semibold">Description</label><textarea id="post-description" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} rows={4} placeholder="Tell people about your video" className="mb-4 w-full resize-none rounded-lg border border-white/25 bg-black p-3 text-sm outline-none focus:border-[#D61E2B]"/>
    {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void upload()} className="w-full rounded-lg bg-[#D61E2B] py-3 font-bold disabled:opacity-60">{busy ? 'Publishing…' : 'Publish post'}</button>
  </div>;
}
