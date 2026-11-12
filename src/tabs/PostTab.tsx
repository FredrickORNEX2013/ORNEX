import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, Film, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/user';
import { invalidateVideoCache } from '@/lib/hooks';

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment'] as const;
export default function PostTab() {
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<string>('Comedy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isChannel, setIsChannel] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  useEffect(() => { getCurrentUserId().then(async (id) => { if (!id) return; const { data } = await supabase.from('profiles').select('role,is_channel').eq('id', id).maybeSingle(); setIsChannel(data?.is_channel === true || data?.role === 'channel'); }); }, []);
  const chooseVideo = (f?: File) => { if (!f) return; setVideo(f); setVideoUrl(URL.createObjectURL(f)); setError(''); };
  const upload = async () => {
    if (!video) { setError('Choose a video to upload.'); return; }
    const userId = await getCurrentUserId();
    if (!userId) { setError('Sign in before posting.'); return; }
    if (isLive && !isChannel) { setError('Live is only for Channels'); return; }
    setBusy(true); setError('');
    try {
      const safe = (f: File) => `${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `uploads/${safe(video)}`;
      const { error: videoError } = await supabase.storage.from('videos').upload(path, video, { contentType: video.type || 'video/mp4' });
      if (videoError) throw videoError;
      let thumbnailUrl: string | null = null;
      if (thumbnail) {
        const thumbPath = `thumbnails/${safe(thumbnail)}`;
        const { error: thumbError } = await supabase.storage.from('thumbnails').upload(thumbPath, thumbnail, { contentType: thumbnail.type });
        if (thumbError) throw thumbError;
        thumbnailUrl = supabase.storage.from('thumbnails').getPublicUrl(thumbPath).data.publicUrl;
      }
      const videoType = duration <= 60 ? 'SHORT' : 'LONG';
      const { error: insertError } = await supabase.from('videos').insert({
        user_id: userId, title: title.trim() || video.name.replace(/\.[^.]+$/, ''), caption: caption.trim() || null, category,
        url: supabase.storage.from('videos').getPublicUrl(path).data.publicUrl, storage_path: path, thumbnail_url: thumbnailUrl,
        orientation: 'portrait', likes: 0, views: 0, downloadable: true, duration_seconds: Math.round(duration), type: videoType,
        is_live: isLive, is_channel: isChannel,
      });
      if (insertError) throw insertError;
      invalidateVideoCache(); setDone(true); setVideo(null); setVideoUrl(''); setThumbnail(null); setTitle(''); setCaption('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };
  return <div className="h-full overflow-y-auto bg-black px-4 pb-24 pt-5 text-white">
    <h1 className="mb-5 text-2xl font-bold">Upload</h1>
    {done && <p className="mb-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-[#D61E2B]"/>Post uploaded successfully.</p>}
    {!video ? <button onClick={() => videoInput.current?.click()} className="flex w-full items-center gap-4 border border-white/20 p-5 text-left"><Upload className="h-8 w-8 text-[#D61E2B]"/><span><b>Select video</b><small className="block text-white/60">Upload a video from your device</small></span></button> : <>
      <video src={videoUrl} controls playsInline onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} className="max-h-[42vh] w-full bg-black object-contain" />
      <p className="my-2 text-xs text-white/70">Duration {duration ? `${Math.round(duration)} sec · ${duration <= 60 ? 'SHORT' : 'LONG'}` : 'detecting…'}</p>
      <div className="my-3 flex gap-2"><button onClick={() => videoInput.current?.click()} className="border border-white/30 px-3 py-2 text-sm">Change video</button><button onClick={() => thumbInput.current?.click()} className="flex items-center gap-2 border border-white/30 px-3 py-2 text-sm"><Film className="h-4 w-4"/>{thumbnail ? 'Thumbnail selected' : 'Choose thumbnail'}</button></div>
      {thumbnail && <img src={URL.createObjectURL(thumbnail)} alt="Thumbnail preview" className="mb-3 h-24 w-16 rounded-full object-cover"/>}
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Title" className="mb-3 w-full border border-white/25 bg-black p-3 text-sm"/>
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} placeholder="Caption" className="mb-3 w-full border border-white/25 bg-black p-3 text-sm"/>
      <label className="mb-2 block text-sm">Category</label><div className="mb-4 flex gap-2">{CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className={`border px-3 py-2 text-sm ${category === item ? 'border-[#D61E2B] bg-[#D61E2B]' : 'border-white/30'}`}>{item}</button>)}</div>
      {isChannel && <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)}/>Mark as live channel video</label>}
      <button disabled={busy} onClick={() => void upload()} className="w-full bg-[#D61E2B] py-3 font-bold">{busy ? 'Uploading…' : 'Post'}</button>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-[#D61E2B]">{error}</p>}
    <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => chooseVideo(e.target.files?.[0])}/><input ref={thumbInput} type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnail(e.target.files?.[0] || null)}/>
  </div>;
}
