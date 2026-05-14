'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Video,
  Play,
  Clock,
  Calendar,
  FileVideo,
  Plus,
  X,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';
import { RehabVideo } from '@/lib/types';

export default function VideoPage() {
  const router = useRouter();
  const { videos, addVideo } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    }
  }

  function handleUpload() {
    if (!selectedFile || !title) return;
    setUploading(true);

    setTimeout(() => {
      const newVideo: RehabVideo = {
        id: `video-${Date.now()}`,
        patientId: 'patient-1',
        title,
        date: new Date().toISOString().split('T')[0],
        duration: '0:00',
        notes: notes || undefined,
        uploadedAt: new Date().toISOString(),
      };
      addVideo(newVideo);
      setUploading(false);
      setUploadComplete(true);
      setTimeout(() => {
        setShowUpload(false);
        setUploadComplete(false);
        setTitle('');
        setNotes('');
        setSelectedFile(null);
      }, 1500);
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-5 pt-14 pb-4">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-xl">
              <ArrowLeft size={22} className="text-text" />
            </button>
            <h1 className="text-lg font-semibold text-text ml-2">I miei video</h1>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Plus size={16} />
            Carica
          </button>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-4">
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-4 border border-accent/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Upload size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Carica i tuoi esercizi</p>
              <p className="text-xs text-text-secondary mt-0.5">
                I video vengono salvati in modo sicuro su Google Drive
              </p>
            </div>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 bg-border-light rounded-2xl flex items-center justify-center mx-auto">
              <FileVideo size={28} className="text-text-muted" />
            </div>
            <p className="text-text-secondary mt-4 font-medium">Nessun video caricato</p>
            <p className="text-text-muted text-sm mt-1">
              Registra e carica i tuoi esercizi
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, i) => (
              <div
                key={video.id}
                className={`bg-surface rounded-2xl overflow-hidden shadow-sm animate-fade-in stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="aspect-video bg-gradient-to-br from-stone-200 to-stone-100 relative flex items-center justify-center">
                  <div className="w-14 h-14 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play size={24} className="text-white ml-1" />
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-md">
                      {video.duration}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-text text-sm">{video.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
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
                    <p className="text-xs text-text-secondary mt-2 italic">{video.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
          <div className="bg-surface w-full rounded-t-3xl p-5 pb-8 animate-slide-up max-w-md mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text">Carica video</h3>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setSelectedFile(null);
                  setTitle('');
                  setNotes('');
                }}
                className="p-2 -mr-2 rounded-xl"
              >
                <X size={22} className="text-text-muted" />
              </button>
            </div>

            {uploadComplete ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success-light rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-success" />
                </div>
                <p className="text-lg font-semibold text-text mt-4">Caricato!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <input type="file" ref={fileRef} accept="video/*" onChange={handleFileChange} className="hidden" />

                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-primary transition-colors"
                >
                  {selectedFile ? (
                    <>
                      <Video size={24} className="text-primary" />
                      <p className="text-sm font-medium text-text">{selectedFile.name}</p>
                      <p className="text-xs text-text-secondary">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="text-text-muted" />
                      <p className="text-sm font-medium text-text-secondary">
                        Tocca per selezionare un video
                      </p>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo del video"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                />

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note (opzionale)"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text resize-none h-20 focus:outline-none focus:border-primary transition-colors"
                />

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !title || uploading}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Caricamento in corso...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
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
