import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  ChevronLeft,
  RotateCw,
  Crop,
  Sparkles,
  Scissors,
  Wand2,
  Check,
  Film,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/user';
import { invalidateVideoCache } from '@/lib/hooks';

type Mode = 'choose' | 'camera' | 'edit' | 'details';

const FILTERS = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'grayscale', name: 'B&W', css: 'grayscale(1)' },
  { id: 'sepia', name: 'Vintage', css: 'sepia(0.8)' },
  { id: 'contrast', name: 'Vivid', css: 'contrast(1.4) saturate(1.3)' },
  { id: 'cool', name: 'Cool', css: 'hue-rotate(180deg) saturate(1.2)' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.5) hue-rotate(-10deg)' },
];

const CATEGORIES = ['Comedy', 'Drama', 'Entertainment', 'Live'] as const;

const EDIT_TOOLS = [
  { id: 'filter', name: 'Filter', icon: Sparkles },
  { id: 'crop', name: 'Crop', icon: Crop },
  { id: 'rotate', name: 'Rotate', icon: RotateCw },
  { id: 'edit', name: 'Edit', icon: Wand2 },
  { id: 'trim', name: 'Trim', icon: Scissors },
  { id: 'effects', name: 'Effects', icon: Zap },
];

export default function PostTab() {
  const [mode, setMode] = useState<Mode>('choose');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Comedy');
  const [activeFilter, setActiveFilter] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [activeTool, setActiveTool] = useState<string>('filter');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const userId = getOrCreateUserId();

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setStream(null);
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      stopCamera();
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true });
      cameraStreamRef.current = s;
      setStream(s);
    } catch {
      setError('Could not access camera. Check permissions or use Upload instead.');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [mode, stream]);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  useEffect(() => {
    if (mode === 'camera') startCamera(facingMode);
    else stopCamera();
  }, [mode, facingMode, startCamera, stopCamera]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSuccess(false);
    setError(null);
    setPreviewUrl(URL.createObjectURL(f));
    setMode('edit');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('video/')) {
      setFile(f);
      setSuccess(false);
      setError(null);
      setPreviewUrl(URL.createObjectURL(f));
      setMode('edit');
    }
  };

  const startRecording = () => {
    if (!cameraStreamRef.current) return;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(cameraStreamRef.current);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const f = new File([blob], `camera-${Date.now()}.webm`, { type: 'video/webm' });
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setMode('edit');
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const flipCamera = () => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));

  const detectOrientation = (f: File): Promise<'landscape' | 'portrait'> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.videoHeight > video.videoWidth ? 'portrait' : 'landscape');
      video.onerror = () => resolve('portrait');
      video.src = URL.createObjectURL(f);
    });
  };

  const generateThumbnail = (f: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration / 2 || 1); };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', 0.7);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(f);
    });
  };

  const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 100);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const fileExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const safeExt = ['webm', 'mov', 'mkv', 'avi'].includes(fileExt) ? 'mp4' : fileExt;
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      const filePath = `uploads/${sanitizeFilename(fileName)}`;
      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filePath);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/videos/${filePath}`);
        xhr.setRequestHeader('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      const orientation = await detectOrientation(file);

      let thumbnailUrl: string | null = null;
      try {
        const thumbBlob = await generateThumbnail(file);
        const thumbName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const thumbPath = `thumbnails/${sanitizeFilename(thumbName)}`;
        const { data: thumbUrlData } = supabase.storage.from('thumbnails').getPublicUrl(thumbPath);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/thumbnails/${thumbPath}`);
          xhr.setRequestHeader('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`);
          xhr.setRequestHeader('Content-Type', 'image/jpeg');
          xhr.setRequestHeader('x-upsert', 'false');
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Thumb failed'));
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(thumbBlob);
        });
        thumbnailUrl = thumbUrlData.publicUrl;
      } catch { /* best-effort */ }

      await supabase.from('videos').insert({
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        url: publicUrlData.publicUrl,
        storage_path: filePath,
        caption: title || null,
        category,
        orientation,
        user_id: userId,
        likes: 0,
        views: 0,
        downloadable: true,
        thumbnail_url: thumbnailUrl,
      });

      setProgress(100);
      setSuccess(true);
      invalidateVideoCache();
      setFile(null);
      setTitle('');
      setPreviewUrl(null);
      setActiveFilter(0);
      setRotation(0);
      setMode('choose');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetToChoose = () => {
    setFile(null);
    setTitle('');
    setPreviewUrl(null);
    setActiveFilter(0);
    setRotation(0);
    setError(null);
    setSuccess(false);
    setMode('choose');
  };

  if (mode === 'choose') {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem-70px)] flex-col bg-[#0A0A0A] px-4 py-6">
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-white">Create</h1>

        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] px-4 py-3 text-sm text-white">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FF2D2D]" />
            <div>
              <p className="font-medium">Live now!</p>
              <p className="mt-0.5 text-xs text-neutral-500">Your video is live in For You and Explore instantly.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] px-4 py-3 text-sm text-white">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF2D2D]" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-2 flex flex-1 flex-col gap-4">
          {/* Upload card */}
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex items-center gap-4 rounded-2xl border p-6 transition-all active:scale-95 ${dragOver ? 'border-[#FF2D2D] bg-[#1A1A1A]' : 'border-[#1E1E1E] bg-[#1E1E1E]'}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2D2D] ornex-red-glow">
              <Upload className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-white">Upload</p>
              <p className="text-sm text-neutral-500">Choose a video from gallery or files</p>
            </div>
          </button>

          {/* Record card */}
          <button
            onClick={() => setMode('camera')}
            className="flex items-center gap-4 rounded-2xl border border-[#1E1E1E] bg-[#1E1E1E] p-6 transition-all active:scale-95"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2D2D] ornex-red-glow">
              <Camera className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-white">Record</p>
              <p className="text-sm text-neutral-500">Record with camera, add filters & sound</p>
            </div>
          </button>

          {/* Gallery card */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 rounded-2xl border border-[#1E1E1E] bg-[#1E1E1E] p-6 transition-all active:scale-95"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2D2D] ornex-red-glow">
              <Film className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-white">Gallery</p>
              <p className="text-sm text-neutral-500">Browse your video collection</p>
            </div>
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: `scaleX(${facingMode === 'user' ? -1 : 1})` }}
          />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
            <button onClick={() => { stopCamera(); resetToChoose(); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-90">
              <X className="h-5 w-5 text-white" />
            </button>
            <button onClick={flipCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-90">
              <RotateCw className="h-5 w-5 text-white" />
            </button>
          </div>
          {recording && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#FF2D2D]/80 px-3 py-1 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span className="text-xs font-bold text-white">REC</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-8 bg-black py-6">
          <div className="w-12" />
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all active:scale-90 ${recording ? 'border-[#FF2D2D] bg-[#FF2D2D] ornex-red-glow' : 'border-white bg-white/20'}`}
          >
            {recording ? <div className="h-5 w-5 rounded bg-white" /> : <div className="h-10 w-10 rounded-full bg-white" />}
          </button>
          <button onClick={flipCamera} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 active:scale-90">
            <Zap className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'edit' && previewUrl) {
    const currentFilter = FILTERS[activeFilter];
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0A]">
        <div className="flex items-center justify-between p-4">
          <button onClick={resetToChoose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A] active:scale-90">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <span className="text-sm font-bold text-white">Edit</span>
          <button onClick={() => setMode('details')} className="rounded-full bg-[#FF2D2D] px-4 py-1.5 text-xs font-bold text-white ornex-red-glow active:scale-95">
            Continue
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
          <video
            src={previewUrl}
            controls
            loop
            muted
            playsInline
            className="max-h-full max-w-full rounded-xl object-contain"
            style={{
              filter: currentFilter.css === 'none' ? undefined : currentFilter.css,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        </div>

        <div className="space-y-3 bg-[#0A0A0A] px-4 pb-6 pt-3">
          {/* 6 editing tools */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {EDIT_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    if (tool.id === 'rotate') setRotation((r) => (r + 90) % 360);
                    if (tool.id === 'crop') setRotation(0);
                  }}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-all ${
                    isActive ? 'border-[#FF2D2D] bg-[#1A1A1A] ornex-red-glow' : 'border-[#1E1E1E] bg-[#1A1A1A]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF2D2D]' : 'text-white/60'}`} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF2D2D]' : 'text-white/60'}`}>{tool.name}</span>
                </button>
              );
            })}
          </div>

          {/* Filter selector (shown when filter tool active) */}
          {activeTool === 'filter' && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {FILTERS.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(i)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    activeFilter === i ? 'bg-[#FF2D2D] text-white ornex-red-glow' : 'bg-[#1A1A1A] text-white/60'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'details' && previewUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0A]">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setMode('edit')} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A] active:scale-90">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <span className="text-sm font-bold text-white">Details</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="mb-4 overflow-hidden rounded-xl">
            <video src={previewUrl} loop muted playsInline className="max-h-48 w-full rounded-xl object-cover" />
          </div>

          {/* Category selector */}
          <label className="mb-2 block text-xs font-bold text-neutral-400">Category</label>
          <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  category === c ? 'bg-[#FF2D2D] text-white ornex-red-glow' : 'border border-[#1E1E1E] bg-[#1A1A1A] text-white/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Add a caption..."
            className="mb-4 w-full rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-[#FF2D2D] focus:outline-none"
          />

          {uploading && (
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1A1A1A]">
                <div className="h-full rounded-full bg-[#FF2D2D] transition-all ornex-red-glow" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-bold text-[#FF2D2D]">{progress}%</span>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#1E1E1E] bg-[#1A1A1A] px-3 py-2 text-sm text-[#FF2D2D]">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-all ${
              !file || uploading
                ? 'cursor-not-allowed bg-[#1A1A1A] text-neutral-600'
                : 'bg-[#FF2D2D] text-white ornex-red-glow active:scale-95'
            }`}
          >
            {uploading ? 'Posting…' : <><Check className="h-4 w-4" /> Post to ORNEX</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-70px)] flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center">
      <Film className="mb-4 h-16 w-16 text-[#FF2D2D]/30" />
      <p className="text-lg font-bold text-white">Create a post</p>
      <button onClick={resetToChoose} className="mt-6 rounded-full bg-[#FF2D2D] px-6 py-3 text-sm font-bold text-white ornex-red-glow active:scale-95">
        Get started
      </button>
    </div>
  );
}
