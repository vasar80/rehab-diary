'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Users, Shield, UserCheck } from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';

interface StaffRow {
  id: string;
  slug: string;
  full_name: string;
  title: string | null;
  role: string;
  email: string | null;
  country_code: string | null;
  markets: string[] | null;
  active: boolean;
  is_advisor: boolean;
  photo_path: string | null;
  visible_apps: string[] | null;
  auth_user_id: string | null;
}

// Kinora-specific module ids (placeholders — the same convention the
// dashboard uses in hr.employees.visible_apps).
const KINORA_MODULE_IDS = [
  'kinora-pazienti',
  'kinora-diari',
  'kinora-video',
  'kinora-contratti',
  'kinora-agents',
  'kinora-configurazione',
];

function flagFor(code: string | null): string {
  if (!code) return '🏳';
  const c = code.toUpperCase();
  if (c === 'IT') return '🇮🇹';
  if (c === 'ES') return '🇪🇸';
  if (c === 'UK' || c === 'GB') return '🇬🇧';
  if (c === 'US') return '🇺🇸';
  return c;
}

function countKinoraAccess(visible: string[] | null): number {
  if (!visible) return 0;
  return visible.filter((a) => a.startsWith('kinora-')).length;
}

export default function StaffPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'all' | 'IT' | 'ES' | 'other'>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/kinora-admin/api/staff', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Errore ${res.status}`);
        }
        const data = await res.json();
        if (mounted) setRows(data.rows || []);
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

  let filtered = rows;
  if (marketFilter === 'IT' || marketFilter === 'ES') {
    filtered = filtered.filter(
      (r) =>
        r.country_code?.toUpperCase() === marketFilter ||
        r.markets?.some((m) => m.toUpperCase() === marketFilter)
    );
  } else if (marketFilter === 'other') {
    filtered = filtered.filter(
      (r) =>
        r.country_code?.toUpperCase() !== 'IT' &&
        r.country_code?.toUpperCase() !== 'ES'
    );
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
    );
  }

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
          <Users size={22} strokeWidth={2.2} style={{ color: '#6366f1' }} />
          Staff
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          {rows.length} dipendenti totali · {activeCount} attivi · tutti i mercati
        </p>
      </header>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: '1 1 280px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
          }}
        >
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome, ruolo, email…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              background: 'transparent',
              color: '#0f172a',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div
          style={{
            display: 'inline-flex',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 3,
          }}
        >
          {(['all', 'IT', 'ES', 'other'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarketFilter(m)}
              style={{
                padding: '6px 14px',
                background: marketFilter === m ? '#6366f1' : 'transparent',
                color: marketFilter === m ? '#fff' : '#475569',
                border: 'none',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {m === 'all' ? 'Tutti' : m === 'other' ? 'Altri' : m}
            </button>
          ))}
        </div>
      </div>

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
          <span>Carico dipendenti…</span>
        </div>
      ) : error ? (
        <div
          style={{
            padding: 18,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            color: '#dc2626',
            fontSize: 14,
          }}
        >
          {error}
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
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                {['Dipendente', 'Ruolo', 'Mercato', 'Email', 'Accessi Kinora', 'Stato'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const kinoraAccessCount = countKinoraAccess(r.visible_apps);
                const initials = r.full_name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('') || '·';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: '#0f172a',
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {r.full_name}
                            {r.is_advisor && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  color: '#a16207',
                                  background: '#fef3c7',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  letterSpacing: '0.04em',
                                }}
                              >
                                ADVISOR
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: 11 }}>
                            {r.title || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background:
                            r.role === 'ceo'
                              ? '#fce7f3'
                              : r.role === 'director'
                                ? '#ddd6fe'
                                : '#e2e8f0',
                          color:
                            r.role === 'ceo'
                              ? '#9d174d'
                              : r.role === 'director'
                                ? '#5b21b6'
                                : '#475569',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 99,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {r.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      <span style={{ fontSize: 16 }}>{flagFor(r.country_code)}</span>{' '}
                      <span style={{ fontSize: 12 }}>{r.country_code || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                      {r.email || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          color: kinoraAccessCount > 0 ? '#059669' : '#94a3b8',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <Shield size={12} />
                        {kinoraAccessCount} / {KINORA_MODULE_IDS.length}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.active ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: '#059669',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <UserCheck size={12} /> Attivo
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Disattivato</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 13,
                    }}
                  >
                    Nessun dipendente corrisponde ai filtri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 18, color: '#94a3b8', fontSize: 12 }}>
        Per modificare gli accessi applicativi di un dipendente vai su{' '}
        <strong>Accessi applicativi</strong> (prossimo step). La colonna{' '}
        <strong>Accessi Kinora</strong> mostra quanti dei {KINORA_MODULE_IDS.length} moduli
        Kinora il dipendente può vedere oggi.
      </p>
    </div>
  );
}
