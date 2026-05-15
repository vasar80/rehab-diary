'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Video as VideoIcon,
  Play,
  Clock,
  Calendar,
  FileVideo,
  Plus,
  X,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';
import { RehabVideo } from '@/lib/types';

export default function VideoPage() {
  const router = useRouter();
  const { user, videos, addVideo } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  }

  function resetForm() {
    setShowUpload(false);
    setUploadComplete(false);
    setTitle('');
    setNotes('');
    setSelectedFile(null);
    setProgress(0);
    setErrorMsg('');
  }

  async function handleUpload() {
    if (!selectedFile || !title) return;
    setUploading(true);
    setErrorMsg('');
    setProgress(0);

    const patientId = user?.id || 'patient-1';
    const patientName = user?.name;

    try {
      const initRes = await fetch('/api/upload-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'video/mp4',
          fileSize: selectedFile.size,
          patientId,
          patientName,
          title,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || `Init failed (${initRes.status})`);
      }

      const { uploadUrl, fileName } = await initRes.json();

      let driveResp = await uploadWithProgress(uploadUrl, selectedFile, (p) => setProgress(p));

      if (!driveResp.id || !driveResp.webViewLink) {
        try {
          const confirmRes = await fetch('/api/upload-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, patientId, patientName }),
          });
          if (confirmRes.ok) {
            const c = await confirmRes.json();
            driveResp = { id: c.id, webViewLink: c.webViewLink };
          }
        } catch {}
      }

      const newVideo: RehabVideo = {
        id: `video-${Date.now()}`,
        patientId,
        title,
        date: new Date().toISOString().split('T')[0],
        googleDriveUrl: driveResp.webViewLink || (driveResp.id ? `https://drive.google.com/file/d/${driveResp.id}/view` : undefined),
        notes: notes || undefined,
        uploadedAt: new Date().toISOString(),
      };
      addVideo(newVideo);
      setUploadComplete(true);
      setTimeout(resetForm, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen pb-32 relative">
      <header className="px-5 pt-14 pb-4 animate-fade-in">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="glass w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
              <ArrowLeft size={20} className="text-text" />
            </button>
            <h1 className="text-xl font-bold text-text">I miei video</h1>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="relative gradient-primary text-white pl-3 pr-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-primary/30 glow-primary"
          >
            <Plus size={16} strokeWidth={3} />
            Carica
          </button>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-4">
        <div className="glass rounded-3xl p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 gradient-warm rounded-2xl blur-md opacity-40" />
              <div className="relative w-11 h-11 rounded-2xl gradient-warm flex items-center justify-center">
                <Upload size={20} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text">Carica i tuoi esercizi</p>
              <p className="text-xs text-text-secondary mt-0.5">
                I video vengono salvati in modo sicuro su Google Drive
              </p>
            </div>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative inline-block">
              <div className="absolute inset-0 gradient-cool rounded-3xl blur-2xl opacity-30 scale-150" />
              <div className="relative w-20 h-20 glass-strong rounded-3xl flex items-center justify-center mx-auto">
                <FileVideo size={32} className="text-primary" strokeWidth={2} />
              </div>
            </div>
            <p className="text-text font-bold mt-5">Nessun video caricato</p>
            <p className="text-text-secondary text-sm mt-1.5 max-w-[240px] mx-auto">
              Registra e carica i tuoi esercizi per rivederli quando vuoi
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-6 glass rounded-2xl px-5 py-3 inline-flex items-center gap-2 font-semibold text-text active:scale-95 transition-transform"
            >
              <Sparkles size={16} className="text-primary" />
              Carica il primo video
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, i) => (
              <a
                key={video.id}
                href={video.googleDriveUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`block glass rounded-3xl overflow-hidden active:scale-[0.98] transition-transform animate-fade-in stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="aspect-video relative gradient-cool flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/0 to-black/30" />
                  <div className="relative w-16 h-16 glass-strong rounded-2xl flex items-center justify-center shadow-2xl">
                    <Play size={26} className="text-primary ml-1" fill="currentColor" />
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-3 right-3 glass-dark text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      {video.duration}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-text text-base">{video.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(video.date), 'd MMM yyyy', { locale: it })}
                    </span>
                    {video.duration && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {video.duration}
                      </span>
                    )}
                  </div>
                  {video.notes && (
                    <p className="text-xs text-text-secondary mt-2 italic pl-3 border-l-2 border-primary/30">
                      {video.notes}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      {showUpload && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end animate-fade-in">
          <div className="glass-strong w-full rounded-t-[2.5rem] p-5 pb-10 animate-slide-up max-w-md mx-auto">
            <div className="w-12 h-1 bg-text-muted/30 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-bold text-text">Carica video</h3>
              <button
                onClick={resetForm}
                className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform"
              >
                <X size={20} className="text-text" />
              </button>
            </div>

            {uploadComplete ? (
              <div className="text-center py-10 animate-scale-in">
                <div className="relative inline-block">
                  <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-50 scale-150" />
                  <div className="relative w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl glow-primary">
                    <CheckCircle size={36} className="text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-text mt-5">Caricato!</p>
                <p className="text-text-secondary text-sm mt-1">Il video è ora su Google Drive</p>
              </div>
            ) : (
              <div className="space-y-3">
                <input type="file" ref={fileRef} accept="video/*" onChange={handleFileChange} className="hidden" />

                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={`w-full rounded-3xl p-6 flex flex-col items-center gap-2 transition-all ${
                    selectedFile
                      ? 'glass-tinted-primary'
                      : 'border-2 border-dashed border-primary/30 bg-white/40 hover:border-primary'
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-40" />
                        <div className="relative w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center">
                          <VideoIcon size={22} className="text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-text mt-1">{selectedFile.name}</p>
                      <p className="text-xs text-text-secondary">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Upload size={22} className="text-primary" />
                      </div>
                      <p className="text-sm font-bold text-text mt-1">Tocca per selezionare</p>
                      <p className="text-xs text-text-secondary">MP4, MOV, fino a qualsiasi dimensione</p>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo del video"
                  disabled={uploading}
                  className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
                />

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note (opzionale)"
                  disabled={uploading}
                  className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-sm text-text placeholder:text-text-muted resize-none h-20 focus:outline-none focus:border-primary focus:bg-white transition-all"
                />

                {uploading && (
                  <div className="bg-white/60 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-text-secondary">Caricamento in corso</span>
                      <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3">
                    <p className="text-danger text-sm font-medium">{errorMsg}</p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !title || uploading}
                  className="w-full gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 glow-primary"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {Math.round(progress)}%
                    </>
                  ) : (
                    <>
                      <Upload size={18} strokeWidth={2.5} />
                      Carica su Google Drive
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ id?: string; webViewLink?: string; reachedFullUpload?: boolean }> {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = (e.loaded / e.total) * 100;
        lastProgress = pct;
        onProgress(pct);
      }
    };

    xhr.upload.onload = () => {
      lastProgress = 100;
      onProgress(100);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ ...data, reachedFullUpload: true });
        } catch {
          resolve({ reachedFullUpload: true });
        }
      } else if (xhr.status === 0 && lastProgress >= 99.9) {
        resolve({ reachedFullUpload: true });
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      if (lastProgress >= 99.9) {
        resolve({ reachedFullUpload: true });
      } else {
        reject(new Error('Errore di rete durante il caricamento'));
      }
    };
    xhr.send(file);
  });
}
