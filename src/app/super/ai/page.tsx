'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, Save, AlertCircle, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { auth as firebaseAuth } from '@/lib/firebase';
import Wordmark from '@/components/Wordmark';

export default function AiConfigPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');
  const [personality, setPersonality] = useState('');
  const [knowledge, setKnowledge] = useState('');

  async function getToken(): Promise<string> {
    const fb = firebaseAuth.currentUser;
    if (!fb) throw new Error('Non autenticato');
    return await fb.getIdToken();
  }

  const load = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setPersonality(data.personality || '');
      setKnowledge(data.knowledge || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'super_admin') {
      router.push('/');
      return;
    }
    load();
  }, [mounted, user, router, load]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality, knowledge }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
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
      <header className="px-4 pt-12 pb-3 flex-shrink-0">
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <button onClick={() => router.push('/super')} className="glass w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <div className="w-11 h-11" />
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md lg:max-w-2xl space-y-5">
        <div className="flex items-center gap-2 px-1">
          <Sparkles size={16} className="text-accent" />
          <h1 className="text-text font-bold text-xl">Personalità e conoscenza</h1>
        </div>
        <p className="text-text-secondary text-sm px-1 -mt-3">
          Influenza come Kinora parla e cosa sa. Queste istruzioni si aggiungono al system prompt clinico di base.
        </p>

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
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">
                Personalità
              </label>
              <textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Es. Parla in modo caldo ma asciutto, mai paternalistico. Saluta con un'osservazione concreta sui dati del giorno, non con frasi generiche. Usa frasi corte."
                className="w-full glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none h-40 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">
                Conoscenza aggiuntiva
              </label>
              <textarea
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                placeholder="Es. Il centro si chiama Stroke Therapy Revolution. La direttrice è la Dr.ssa X. Le sedute durano 50 min. Le scale usate sono MAL-30, FMA, ARAT. Non somministriamo terapia farmacologica."
                className="w-full glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none h-48 focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : savedTick ? (
                <>
                  <Check size={18} strokeWidth={3} />
                  Salvato
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salva
                </>
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
