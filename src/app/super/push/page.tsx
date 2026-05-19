'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Bell, Send, AlertCircle, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getAccessToken } from '@/lib/supabase/client';
import Wordmark from '@/components/Wordmark';

interface Patient { id: string; name?: string; email?: string }
interface Therapist { id: string; name?: string; email?: string }

export default function PushAdminPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ sent: number; failed: number; gone: number } | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [target, setTarget] = useState<string>('all');
  const [title, setTitle] = useState('Kinora');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');

  async function getToken(): Promise<string> {
    return await getAccessToken();
  }

  const loadUsers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setPatients(data.patients || []);
      setTherapists(data.therapists || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'super_admin') { router.push('/'); return; }
    loadUsers();
  }, [mounted, user, router, loadUsers]);

  async function handleSend() {
    if (!body.trim() || !title.trim()) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: target, title, body, url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setResult({ sent: data.sent, failed: data.failed, gone: data.gone });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore invio');
    } finally {
      setSending(false);
    }
  }

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 relative">
      <header className="px-4 pt-12 pb-3 flex-shrink-0 sticky top-0 z-20 backdrop-blur-md bg-white/40 border-b border-white/40">
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <button onClick={() => router.push('/super')} className="glass w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <div className="w-11 h-11" />
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md lg:max-w-2xl space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Bell size={16} className="text-accent" />
          <h1 className="text-text font-bold text-xl">Notifiche push</h1>
        </div>
        <p className="text-text-secondary text-sm px-1 -mt-2">Invio manuale a un utente specifico o a tutti gli iscritti.</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">Destinatario</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full glass-strong border border-white/80 rounded-2xl px-4 py-3 text-text focus:outline-none focus:border-primary"
              >
                <option value="all">Tutti gli iscritti alle notifiche</option>
                <optgroup label="Pazienti">
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name || p.email || p.id}</option>)}
                </optgroup>
                <optgroup label="Terapisti">
                  {therapists.map((t) => <option key={t.id} value={t.id}>{t.name || t.email || t.id}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">Titolo</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full glass-strong border border-white/80 rounded-2xl px-4 py-3 text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">Messaggio</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Es. Ricordati di compilare il diario di oggi."
                className="w-full glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">URL (al tap)</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
                className="w-full glass-strong border border-white/80 rounded-2xl px-4 py-3 text-text focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>

            {result && (
              <div className="bg-success/10 border border-success/30 rounded-2xl px-4 py-3 flex items-start gap-2">
                <Check size={16} className="text-success shrink-0 mt-0.5" />
                <p className="text-success text-sm">
                  Inviate: {result.sent}{result.failed ? ` · Fallite: ${result.failed}` : ''}{result.gone ? ` · Pulite (subscription scadute): ${result.gone}` : ''}
                </p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Invia</>}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
