'use client';

/**
 * VersionWatcher — banner che si rivela quando un nuovo deploy ha
 * cambiato i file che riguardano questo lato dell'app.
 *
 * Mount una volta nel layout della propria area:
 *   - lato paziente: <VersionWatcher endpoint="/api/version/patient" tone="patient" />
 *   - lato staff:    <VersionWatcher endpoint="/api/version/admin"   tone="admin"   />
 *
 * Logica:
 *  1. Al mount fetcha l'endpoint e memorizza la `version` come baseline.
 *     (NIENTE localStorage: ogni nuovo tab ribasella, così non vediamo
 *     mai il banner subito al primo load.)
 *  2. Ogni 90 secondi e su `focus` ri-fetcha. Se la version è cambiata
 *     mostra il banner.
 *  3. "Aggiorna" → unregister SW + purge Cache Storage + hard reload.
 *  4. "Chiudi" → nasconde fino al prossimo cambio.
 */

import { useEffect, useState } from 'react';
import { RefreshCcw, Sparkles, X } from 'lucide-react';

interface Props {
  endpoint: string;
  tone?: 'patient' | 'admin';
}

interface VersionInfo {
  version: string;
  side: string;
  buildTime: string;
  ts: number;
}

const POLL_INTERVAL_MS = 90 * 1000;

export default function VersionWatcher({ endpoint, tone = 'patient' }: Props) {
  const [baseline, setBaseline] = useState<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchVersion(): Promise<VersionInfo | null> {
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.json()) as VersionInfo;
      } catch {
        return null;
      }
    }

    async function init() {
      const v = await fetchVersion();
      if (cancelled || !v) return;
      setBaseline(v.version);
      setLatest(v.version);
    }
    init();

    const id = window.setInterval(async () => {
      if (cancelled) return;
      const v = await fetchVersion();
      if (!v) return;
      setLatest(v.version);
    }, POLL_INTERVAL_MS);

    const onFocus = async () => {
      const v = await fetchVersion();
      if (!v) return;
      setLatest(v.version);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [endpoint]);

  // Resetto dismissed quando la versione cambia di nuovo, così
  // l'utente che chiude un banner vede comunque il successivo.
  useEffect(() => {
    if (latest && latest !== baseline) setDismissed(false);
  }, [latest, baseline]);

  async function hardRefresh() {
    setRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Non bloccante — il reload comunque pesca asset freschi.
    }
    try {
      (window.location as unknown as { reload: (force?: boolean) => void }).reload(true);
    } catch {
      window.location.reload();
    }
  }

  const hasUpdate = latest != null && baseline != null && latest !== baseline && !dismissed;
  if (!hasUpdate) return null;

  // Tone-based palette so the patient banner is warm/brand-aligned,
  // and the admin banner reads as "system" against the dark sidebar.
  const isPatient = tone === 'patient';
  const accent = isPatient
    ? 'linear-gradient(135deg, #E85A7A 0%, #322A6E 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #ec4899 100%)';
  const buttonBg = isPatient ? '#E85A7A' : '#6366f1';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 14,
        right: 14,
        zIndex: 9999,
        background: '#0f172a',
        color: '#f1f5f9',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: '10px 12px 10px 14px',
        boxShadow: '0 20px 40px -12px rgba(15,23,42,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 380,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={14} color="#fff" strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>Nuova versione disponibile</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
          Aggiorna per vedere le ultime modifiche
        </div>
      </div>
      <button
        type="button"
        disabled={refreshing}
        onClick={hardRefresh}
        style={{
          padding: '6px 11px',
          borderRadius: 8,
          border: 'none',
          background: refreshing ? '#475569' : buttonBg,
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          cursor: refreshing ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
        }}
      >
        <RefreshCcw
          size={12}
          strokeWidth={2.4}
          style={refreshing ? { animation: 'vw-spin 1s linear infinite' } : undefined}
        />
        Aggiorna
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Chiudi"
        title="Chiudi"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
      <style>{`@keyframes vw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
