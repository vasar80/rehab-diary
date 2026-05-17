'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { auth as firebaseAuth } from '@/lib/firebase';
import { isPushSupported, getPushPermission, subscribeToPush } from '@/lib/push-client';

const DISMISS_KEY = 'kinora-push-banner-dismissed-at';
const DISMISS_HOURS = 24;

export default function NotificationsBanner() {
  const user = useAppStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    const perm = getPushPermission();
    if (perm !== 'default') return;

    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (stored) {
        const ageMs = Date.now() - parseInt(stored, 10);
        if (ageMs < DISMISS_HOURS * 3600 * 1000) return;
      }
    } catch {}

    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, [user]);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  }

  async function activate() {
    if (!user) return;
    setActivating(true);
    setError('');
    try {
      const fb = firebaseAuth.currentUser;
      const idToken = fb ? await fb.getIdToken() : '';
      if (!idToken) {
        setError('Devi essere loggato per attivare le notifiche');
        return;
      }
      const res = await subscribeToPush(user.id, idToken);
      if (res.ok) {
        setVisible(false);
      } else if (res.error === 'denied') {
        setError('Notifiche bloccate dal browser. Sblocca dalle impostazioni del sito.');
      } else {
        setError(`Non sono riuscito ad attivarle (${res.error || 'errore'})`);
      }
    } finally {
      setActivating(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 z-40 px-4 pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}>
      <div className="mx-auto max-w-md lg:max-w-2xl pointer-events-auto">
        <div className="glass-strong rounded-3xl p-4 flex items-start gap-3 shadow-2xl">
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text font-bold text-sm">Vuoi ricevere reminder?</p>
            <p className="text-text-secondary text-xs mt-0.5 leading-snug">
              Ti avviso poco prima degli appuntamenti e se hai dimenticato il diario.
            </p>
            {error && <p className="text-danger text-xs mt-2">{error}</p>}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={activate}
                disabled={activating}
                className="gradient-primary text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-60"
              >
                {activating ? 'Attivo…' : 'Attiva'}
              </button>
              <button
                onClick={dismiss}
                className="text-text-secondary text-xs font-semibold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              >
                Più tardi
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform shrink-0"
            aria-label="Chiudi"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
