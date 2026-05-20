'use client';

import { useEffect, useState } from 'react';
import { Loader2, Settings2, Check } from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';

interface FeatureRow {
  slug: string;
  label: string;
  description: string | null;
  area: string;
  sort_order: number;
}

interface TierFeatureRow {
  tier: string;
  feature_slug: string;
  enabled: boolean;
}

const TIER_DEF = [
  {
    id: 'free',
    label: 'Free',
    desc: 'Iscritti gratuiti — base',
    color: '#64748b',
    background: '#f1f5f9',
  },
  {
    id: 'self',
    label: 'Self',
    desc: 'Iscritti paganti self-service',
    color: '#5b21b6',
    background: '#ddd6fe',
  },
  {
    id: 'care',
    label: 'Care',
    desc: 'Programma RTM con terapista',
    color: '#fff',
    background: 'linear-gradient(135deg, #E85A7A 0%, #322A6E 100%)',
  },
  {
    id: 'studio_nc',
    label: 'Studio NC',
    desc: 'Partecipante studio scientifico NC',
    color: '#fff',
    background: '#0EA5E9',
  },
  {
    id: 'studio_tot',
    label: 'Studio TOT',
    desc: 'Partecipante studio scientifico TOT',
    color: '#fff',
    background: '#10b981',
  },
];

export default function TierConfigPage() {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [matrix, setMatrix] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/kinora-admin/api/tier-config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Errore ${res.status}`);
        }
        const data = await res.json();
        if (!mounted) return;
        setFeatures(data.features || []);
        const m = new Map<string, boolean>();
        for (const row of (data.matrix as TierFeatureRow[]) || []) {
          m.set(`${row.tier}|${row.feature_slug}`, row.enabled);
        }
        setMatrix(m);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Errore');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function toggle(tier: string, slug: string, currentEnabled: boolean) {
    const key = `${tier}|${slug}`;
    setSavingKey(key);
    setMatrix((m) => {
      const next = new Map(m);
      next.set(key, !currentEnabled);
      return next;
    });
    try {
      const token = await getAccessToken();
      const res = await fetch('/kinora-admin/api/tier-config', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, feature_slug: slug, enabled: !currentEnabled }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Errore ${res.status}`);
      }
    } catch (e) {
      // Rollback
      setMatrix((m) => {
        const next = new Map(m);
        next.set(key, currentEnabled);
        return next;
      });
      setError(e instanceof Error ? e.message : 'Errore aggiornamento');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.3px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Settings2 size={22} strokeWidth={2.2} style={{ color: '#8b5cf6' }} />
          Configurazione tier
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          Decidi cosa vede ogni tipo di paziente. Le modifiche sono immediate — al prossimo
          login (o entro 90 secondi se la pagina è già aperta) il paziente vede / smette di
          vedere la funzionalità.
        </p>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: '#94a3b8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Loader2 size={20} className="animate-spin" />
          <span>Carico configurazione…</span>
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: '#f8fafc',
                    minWidth: 280,
                  }}
                >
                  Funzionalità
                </th>
                {TIER_DEF.map((t) => (
                  <th
                    key={t.id}
                    style={{
                      textAlign: 'center',
                      padding: '14px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: '#f8fafc',
                      minWidth: 130,
                    }}
                  >
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 700,
                          background: t.background,
                          color: t.color,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {t.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: '#94a3b8',
                          fontWeight: 500,
                          textTransform: 'none',
                          letterSpacing: 0,
                        }}
                      >
                        {t.desc}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.slug} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>
                      {f.label}
                    </div>
                    {f.description && (
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
                        {f.description}
                      </div>
                    )}
                  </td>
                  {TIER_DEF.map((t) => {
                    const key = `${t.id}|${f.slug}`;
                    const enabled = matrix.get(key) ?? false;
                    const isSaving = savingKey === key;
                    return (
                      <td
                        key={t.id}
                        style={{ textAlign: 'center', padding: '12px 12px' }}
                      >
                        <button
                          type="button"
                          aria-label={`${enabled ? 'Togli' : 'Dai'} ${f.label} al tier ${t.label}`}
                          disabled={isSaving}
                          onClick={() => toggle(t.id, f.slug, enabled)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: enabled ? 'none' : '1.5px solid #cbd5e1',
                            background: enabled
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : '#fff',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isSaving ? 'wait' : 'pointer',
                            transition: 'all 0.12s',
                            opacity: isSaving ? 0.5 : 1,
                          }}
                        >
                          {isSaving ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : enabled ? (
                            <Check size={15} strokeWidth={3} />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 14, color: '#94a3b8', fontSize: 12 }}>
        Lo schema è definito in <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>kinora.feature</code> e <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>kinora.tier_feature</code>. Per aggiungere una nuova funzionalità contattami: inserisco una riga nel catalogo e compare automaticamente qui.
      </p>
    </div>
  );
}
