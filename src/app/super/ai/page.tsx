'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, Save, AlertCircle, Check, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { auth as firebaseAuth } from '@/lib/firebase';
import Wordmark from '@/components/Wordmark';
import { DEFAULT_BASE_PROMPT } from '@/lib/system-prompt';

export default function AiConfigPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');
  const [basePrompt, setBasePrompt] = useState('');
  const [clinical, setClinical] = useState('');
  const [hasCustom, setHasCustom] = useState(false);

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
      const stored = (data.basePrompt || data.personality || '').trim();
      if (stored) {
        setBasePrompt(stored);
        setHasCustom(true);
      } else {
        setBasePrompt(DEFAULT_BASE_PROMPT);
        setHasCustom(false);
      }
      setClinical(data.knowledge || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento');
      setBasePrompt(DEFAULT_BASE_PROMPT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'super_admin') { router.push('/'); return; }
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
        body: JSON.stringify({ basePrompt, knowledge: clinical }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      setHasCustom(true);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefault() {
    if (!confirm('Ripristino il system prompt di default. Le tue modifiche andranno perse. Continuare?')) return;
    setBasePrompt(DEFAULT_BASE_PROMPT);
  }

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const dirty = basePrompt.trim() !== DEFAULT_BASE_PROMPT.trim();

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
          <h1 className="text-text font-bold text-xl">System prompt</h1>
        </div>
        <p className="text-text-secondary text-sm px-1 -mt-3">
          Questo è il system prompt esatto che invio a Kinora ad ogni messaggio. Modificalo qui e l'effetto è immediato sul prossimo turno. Il contesto runtime (data, diari recenti, contratto, ecc.) viene appeso automaticamente — qui editi solo identità, tono e regole.
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

            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                {hasCustom ? 'Versione personalizzata' : 'Default'} · {basePrompt.length} caratteri
              </p>
              {dirty && (
                <button
                  onClick={handleResetDefault}
                  className="text-[11px] font-bold text-text-secondary flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <RotateCcw size={11} /> Ripristina default
                </button>
              )}
            </div>
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              className="w-full glass-strong border border-white/80 rounded-2xl p-4 text-[13px] text-text leading-relaxed resize-y h-[60vh] focus:outline-none focus:border-primary font-mono"
            />

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-1">
                Informazioni cliniche aggiuntive
              </label>
              <p className="text-xs text-text-muted px-1">
                Note cliniche che Kinora deve sapere su questo paziente o sul centro. Si aggiungono al prompt come una sezione &quot;Informazioni cliniche&quot;.
              </p>
              <textarea
                value={clinical}
                onChange={(e) => setClinical(e.target.value)}
                placeholder="Es. Il centro è specializzato in CIMT post-ictus. Le scale standard sono MAL-30, FMA, ARAT."
                className="w-full glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none h-32 focus:outline-none focus:border-primary"
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
