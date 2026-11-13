import { useEffect, useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { supabase, type VideoRecord } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import { publishVideo, invalidateVideoCache } from '@/lib/hooks';

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;
type PostTabProps = { onPosted: (isShort: boolean) => void };

function parseVimeoId(value: string) {
  try {
    const url = new URL(value.trim());
    if (!['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname.toLowerCase())) return null;
    return url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1] || null;
  } catch { return null; }
}

export default function PostTab({ onPosted }: PostTabProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Comedy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isChannel, setIsChannel] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getCurrentUserId().then(async (id) => {
      if (!id) return;
      const { data } = await supabase.from('profiles').select('role,is_channel').eq('id', id).maybeSingle();
      if (!cancelled) setIsChannel(data?.is_channel === true || data?.role === 'channel');
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const chooseVideo = (file?: File) => {
    if (!file) return;
    setVideo(file);
    setVimeoUrl('');
    setDuration(null);
    setVideoUrl(URL.createObjectURL(file));
    setError('');
  };

  const checkVimeoDuration = async (value: string) => {
    setVimeoUrl(value);
    if (!value.trim()) return;
    const id = parseVimeoId(value);
    if (!id) { setError('Enter a valid Vimeo video URL.'); return; }
    setError('');
    try {
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`);
      if (!response.ok) throw new Error(`Vimeo could not read this video (${response.status}).`);
      const metadata = await response.json() as { duration?: number; title?: string };
      if (typeof metadata.duration !== 'number' || metadata.duration <= 0) throw new Error('Vimeo did not provide a valid video duration.');
      setDuration(metadata.duration);
      if (!title.trim() && metadata.title) setTitle(metadata.title);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load Vimeo video details.');
      setDuration(null);
    }
  };

  const upload = async () => {
    const vimeoId = parseVimeoId(vimeoUrl);
    if (!video && !vimeoId) { setError('Choose a video or enter a valid Vimeo URL.'); return; }
    if (duration === null || !Number.isFinite(duration) || duration <= 0) { setError('Wait for a valid video duration before posting.'); return; }
    if (!vimeoId && !thumbnail) { setError('Choose a thumbnail image.'); return; }
    if (!title.trim()) { setError('Enter a title.'); return; }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setError(sessionError.message); return; }
    const userId = session?.user?.id;
    if (!userId) { setError('Sign in before posting.'); return; }
    if (isLive && !isChannel) { setError('Live is only for Channels'); return; }

    setBusy(true);
    setError('');
    try {
      const safe = (file: File) => `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let storagePath = `vimeo/${vimeoId}`;
      let publicVideoUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1`;
      let thumbnailUrl: string | null = null;
      if (!vimeoId && video) {
        storagePath = `uploads/${safe(video)}`;
        const { error: videoError } = await supabase.storage.from('videos').upload(storagePath, video, { contentType: video.type || 'video/mp4' });
        if (videoError) throw videoError;
        publicVideoUrl = supabase.storage.from('videos').getPublicUrl(storagePath).data.publicUrl;
        if (thumbnail) {
          const thumbnailPath = `thumbnails/${safe(thumbnail)}`;
          const { error: thumbnailError } = await supabase.storage.from('thumbnails').upload(thumbnailPath, thumbnail, { contentType: thumbnail.type || 'image/jpeg' });
          if (thumbnailError) throw thumbnailError;
          thumbnailUrl = supabase.storage.from('thumbnails').getPublicUrl(thumbnailPath).data.publicUrl;
        }
      }

      const row = {
        user_id: userId,
        title: title.trim(),
        caption: caption.trim() || null,
        category,
        url: publicVideoUrl,
        storage_path: storagePath,
        thumbnail_url: thumbnailUrl,
        orientation: 'portrait' as const,
        likes: 0,
        views: 0,
        downloadable: !vimeoId,
        duration_seconds: Math.ceil(duration),
        type: duration <= 60 ? 'SHORT' : 'LONG',
        is_live: isLive,
        is_channel: isChannel,
        status: 'approved',
        vimeo_url: vimeoId ? `https://vimeo.com/${vimeoId}` : null,
      };
      const { data, error: insertError } = await supabase.from('videos').insert(row).select('*').single();
      if (insertError) throw insertError;
      const saved = data as VideoRecord;
      publishVideo(saved);
      invalidateVideoCache();
      setDone(true);
      const isShort = duration <= 60;
      setVideo(null); setVideoUrl(''); setDuration(null); setThumbnail(null); setTitle(''); setCaption(''); setVimeoUrl(''); setIsLive(false);
      if (videoInput.current) videoInput.current.value = '';
      if (thumbInput.current) thumbInput.current.value = '';
      onPosted(isShort);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="h-full overflow-y-auto bg-black px-4 pb-24 pt-5 text-white">
    <h1 className="mb-5 text-2xl font-bold">Upload</h1>
    {done && <p className="mb-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-[#D61E2B]"/>Post uploaded successfully.</p>}
    <label htmlFor="vimeo-url" className="mb-2 block text-sm font-semibold">Vimeo URL (optional)</label>
    <input id="vimeo-url" value={vimeoUrl} onChange={(event) => void checkVimeoDuration(event.target.value)} placeholder="https://vimeo.com/123456789" className="mb-4 w-full border border-white/25 bg-black p-3 text-sm" />
    {!video && !vimeoUrl ? <button onClick={() => videoInput.current?.click()} className="flex w-full items-center gap-4 border border-white/20 p-5 text-left"><Upload className="h-8 w-8 text-[#D61E2B]"/><span><b>Select video</b><small className="block text-white/60">Upload from gallery or files</small></span></button> : <>
      {video && <><video src={videoUrl} controls playsInline onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} className="max-h-[42vh] w-full bg-black object-contain"/><p className="my-2 text-xs text-white/70">{duration === null ? 'Detecting duration…' : `Duration ${Math.ceil(duration)} sec · ${duration <= 60 ? 'SHORT' : 'LONG'}`}</p></>}
      {video && <button onClick={() => videoInput.current?.click()} className="mb-4 border border-white/30 px-3 py-2 text-sm">Change video</button>}
      {!parseVimeoId(vimeoUrl) && <><label className="mb-2 block text-sm font-semibold">Thumbnail</label><button onClick={() => thumbInput.current?.click()} className="mb-3 block border border-white/30 px-3 py-2 text-sm">{thumbnail ? 'Change thumbnail' : 'Choose thumbnail image'}</button>{thumbnail && <img src={URL.createObjectURL(thumbnail)} alt="Thumbnail preview" className="mb-3 h-28 w-20 object-cover"/>}</>}
      <label className="mb-1 block text-sm font-semibold" htmlFor="post-title">Title</label>
      <input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Add a title" className="mb-3 w-full border border-white/25 bg-black p-3 text-sm text-white placeholder:text-white/60"/>
      <label className="mb-1 block text-sm font-semibold" htmlFor="post-caption">Caption</label>
      <textarea id="post-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} placeholder="Add a caption" className="mb-3 w-full border border-white/25 bg-black p-3 text-sm text-white placeholder:text-white/60"/>
      <label className="mb-2 block text-sm font-semibold">Category</label><div className="mb-4 flex gap-2">{CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`border px-3 py-2 text-sm ${category === item ? 'border-[#D61E2B] bg-[#D61E2B]' : 'border-white/30 bg-black'}`}>{item}</button>)}</div>
      {isChannel && <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={isLive} onChange={(event) => setIsLive(event.target.checked)} className="accent-[#D61E2B]"/>Mark as a live channel video</label>}
      <button disabled={busy} onClick={() => void upload()} className="w-full bg-[#D61E2B] py-3 font-bold disabled:opacity-60">{busy ? 'Uploading…' : 'Post'}</button>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-[#D61E2B]">{error}</p>}
    <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(event) => chooseVideo(event.target.files?.[0])}/>
    <input ref={thumbInput} type="file" accept="image/*" className="hidden" onChange={(event) => setThumbnail(event.target.files?.[0] || null)}/>
  </div>;
}
