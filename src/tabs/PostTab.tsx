import { useEffect, useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import { invalidateVideoCache } from '@/lib/hooks';

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;
export default function PostTab() {
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
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
    void getCurrentUserId().then(async (id) => {
      if (!id) return;
      const { data } = await supabase.from('profiles').select('role,is_channel').eq('id', id).maybeSingle();
      setIsChannel(data?.is_channel === true || data?.role === 'channel');
    });
  }, []);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const chooseVideo = (file?: File) => {
    if (!file) return;
    setVideo(file);
    setDuration(null);
    setVideoUrl(URL.createObjectURL(file));
    setError('');
  };
  const upload = async () => {
    if (!video) { setError('Choose a video to upload.'); return; }
    if (duration === null || !Number.isFinite(duration)) { setError('Wait for the video duration to be detected.'); return; }
    if (!thumbnail) { setError('Choose a thumbnail image.'); return; }
    if (!title.trim()) { setError('Enter a title.'); return; }
    if (!caption.trim()) { setError('Enter a caption.'); return; }
    const userId = await getCurrentUserId();
    if (!userId) { setError('Sign in before posting.'); return; }
    if (isLive && !isChannel) { setError('Live is only for Channels'); return; }
    setBusy(true);
    setError('');
    try {
      const safe = (file: File) => `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const videoPath = `uploads/${safe(video)}`;
      const { error: videoError } = await supabase.storage.from('videos').upload(videoPath, video, { contentType: video.type || 'video/mp4' });
      if (videoError) throw videoError;
      const thumbnailPath = `thumbnails/${safe(thumbnail)}`;
      const { error: thumbnailError } = await supabase.storage.from('thumbnails').upload(thumbnailPath, thumbnail, { contentType: thumbnail.type || 'image/jpeg' });
      if (thumbnailError) throw thumbnailError;
      const videoType = duration <= 60 ? 'SHORT' : 'LONG';
      const { error: insertError } = await supabase.from('videos').insert({
        user_id: userId,
        title: title.trim(),
        caption: caption.trim(),
        category,
        url: supabase.storage.from('videos').getPublicUrl(videoPath).data.publicUrl,
        storage_path: videoPath,
        thumbnail_url: supabase.storage.from('thumbnails').getPublicUrl(thumbnailPath).data.publicUrl,
        orientation: 'portrait', likes: 0, views: 0, downloadable: true,
        duration_seconds: Math.ceil(duration), type: videoType,
        is_live: isLive, is_channel: isChannel,
      });
      if (insertError) throw insertError;
      invalidateVideoCache();
      setDone(true);
      setVideo(null); setVideoUrl(''); setDuration(null); setThumbnail(null); setTitle(''); setCaption(''); setIsLive(false);
      if (videoInput.current) videoInput.current.value = '';
      if (thumbInput.current) thumbInput.current.value = '';
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="h-full overflow-y-auto bg-black px-4 pb-24 pt-5 text-white">
    <h1 className="mb-5 text-2xl font-bold">Upload</h1>
    {done && <p className="mb-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-[#D61E2B]"/>Post uploaded successfully.</p>}
    {!video ? <button onClick={() => videoInput.current?.click()} className="flex w-full items-center gap-4 border border-white/20 p-5 text-left"><Upload className="h-8 w-8 text-[#D61E2B]"/><span><b>Select video</b><small className="block text-white/60">All users can upload Shorts and long videos</small></span></button> : <>
      <video src={videoUrl} controls playsInline onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} className="max-h-[42vh] w-full bg-black object-contain"/>
      <p className="my-2 text-xs text-white/70">{duration === null ? 'Detecting duration…' : `Duration ${Math.ceil(duration)} sec · ${duration <= 60 ? 'SHORT' : 'LONG'}`}</p>
      <button onClick={() => videoInput.current?.click()} className="mb-4 border border-white/30 px-3 py-2 text-sm">Change video</button>
      <label className="mb-2 block text-sm font-semibold">Thumbnail</label>
      <button onClick={() => thumbInput.current?.click()} className="mb-3 block border border-white/30 px-3 py-2 text-sm">{thumbnail ? 'Change thumbnail' : 'Choose thumbnail image'}</button>
      {thumbnail && <img src={URL.createObjectURL(thumbnail)} alt="Thumbnail preview" className="mb-3 h-28 w-20 object-cover"/>}
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
