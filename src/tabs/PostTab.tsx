import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Images, Upload, X } from 'lucide-react';
import { supabase, type VideoRecord } from '@/lib/supabase';
import { publishVideo } from '@/lib/hooks';
import { getCurrentUserId } from '@/lib/user';

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;
type PostTabProps = { onPosted: (isShort: boolean) => void };
type PickerMode = 'upload' | 'record' | 'gallery';

export default function PostTab({ onPosted }: PostTabProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Entertainment');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const recordInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const chooseVideo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Choose a video file.'); return; }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideo(file);
    setDuration(null);
    setVideoUrl(URL.createObjectURL(file));
    setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 100));
    setError('');
    setDone(false);
  };

  const clearVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideo(null);
    setVideoUrl('');
    setDuration(null);
    setTitle('');
    if (uploadInput.current) uploadInput.current.value = '';
    if (recordInput.current) recordInput.current.value = '';
    if (galleryInput.current) galleryInput.current.value = '';
  };

  const openPicker = (mode: PickerMode) => {
    const picker = mode === 'record' ? recordInput : mode === 'gallery' ? galleryInput : uploadInput;
    picker.current?.click();
  };

  const postVideo = async () => {
    if (!video) { setError('Choose or record a video first.'); return; }
    if (!duration || !Number.isFinite(duration)) { setError('Wait for the video preview to finish loading before posting.'); return; }
    if (!title.trim()) { setError('Enter a title.'); return; }
    const userId = await getCurrentUserId();
    if (!userId) { setError('Sign in before posting.'); return; }

    setBusy(true);
    setError('');
    try {
      const safeName = video.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `uploads/${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(storagePath, video, { contentType: video.type || 'video/mp4' });
      if (uploadError) throw uploadError;
      const publicVideoUrl = supabase.storage.from('videos').getPublicUrl(storagePath).data.publicUrl;
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
        duration_seconds: Math.ceil(duration),
        type: 'SHORT',
        is_live: false,
        status: 'approved',
      };
      const { data, error: insertError } = await supabase.from('videos').insert(row).select('*').single();
      if (insertError) throw insertError;
      publishVideo(data as VideoRecord);
      setDone(true);
      clearVideo();
      setCaption('');
      onPosted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not publish your video.');
    } finally {
      setBusy(false);
    }
  };

  const actions: { mode: PickerMode; title: string; description: string; icon: typeof Upload }[] = [
    { mode: 'upload', title: 'Upload', description: 'Choose a video from gallery or files', icon: Upload },
    { mode: 'record', title: 'Record', description: 'Record with camera, add filters & sound', icon: Camera },
    { mode: 'gallery', title: 'Gallery', description: 'Browse your video collection', icon: Images },
  ];

  return <div className="h-full overflow-y-auto bg-black px-4 pb-24 pt-6 text-white">
    <h1 className="mb-6 text-4xl font-extrabold tracking-tight">Create</h1>

    <div className="space-y-3">
      {actions.map(({ mode, title: actionTitle, description, icon: Icon }) => (
        <button key={mode} type="button" onClick={() => openPicker(mode)} className="flex min-h-[104px] w-full items-center gap-5 rounded-2xl border border-white/15 bg-[#111] p-5 text-left transition-colors hover:border-[#D61E2B]/70 hover:bg-[#181818] active:scale-[.99]">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#D61E2B]/10"><Icon aria-hidden="true" className="h-7 w-7 text-[#D61E2B]" strokeWidth={2.2}/></span>
          <span><span className="block text-lg font-bold">{actionTitle}</span><span className="mt-1 block text-sm leading-5 text-white/60">{description}</span></span>
        </button>
      ))}
    </div>

    <input ref={uploadInput} type="file" accept="video/*" className="hidden" onChange={(event) => chooseVideo(event.target.files?.[0])}/>
    <input ref={recordInput} type="file" accept="video/*" capture="environment" className="hidden" onChange={(event) => chooseVideo(event.target.files?.[0])}/>
    <input ref={galleryInput} type="file" accept="video/*" className="hidden" onChange={(event) => chooseVideo(event.target.files?.[0])}/>

    {done && <p role="status" className="mt-5 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-[#D61E2B]"/>Post published and added to your videos.</p>}
    {video && <section aria-label="Prepare your video post" className="mt-6 rounded-2xl border border-white/15 bg-[#111] p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Your video</h2><button type="button" aria-label="Remove selected video" onClick={clearVideo} className="rounded-full p-2 text-white/70 hover:bg-white/10"><X className="h-5 w-5"/></button></div>
      {videoUrl && <video src={videoUrl} controls playsInline onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} className="mb-4 max-h-64 w-full rounded-lg bg-neutral-900"/>}
      <label htmlFor="post-title" className="mb-1 block text-sm font-semibold">Title</label>
      <input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Add a title" className="mb-4 w-full rounded-lg border border-white/20 bg-black p-3 text-sm outline-none focus:border-[#D61E2B]"/>
      <label htmlFor="post-category" className="mb-1 block text-sm font-semibold">Category</label>
      <select id="post-category" value={category} onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])} className="mb-4 w-full rounded-lg border border-white/20 bg-black p-3 text-sm"><option value="Comedy">Comedy</option><option value="Drama">Drama</option><option value="Entertainment">Entertainment</option></select>
      <label htmlFor="post-caption" className="mb-1 block text-sm font-semibold">Caption</label>
      <textarea id="post-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} rows={3} placeholder="Tell people about your video" className="mb-4 w-full resize-none rounded-lg border border-white/20 bg-black p-3 text-sm outline-none focus:border-[#D61E2B]"/>
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void postVideo()} className="w-full rounded-lg bg-[#D61E2B] py-3 font-bold disabled:opacity-60">{busy ? 'Publishing…' : 'Post video'}</button>
    </section>}
    {!video && error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
  </div>;
}
