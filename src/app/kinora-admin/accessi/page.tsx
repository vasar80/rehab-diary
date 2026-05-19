'use client';

import { useEffect, useState } from 'react';
import { Loader2, Shield, Check } from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';
import { KINORA_APPS } from '../_lib/apps';

interface AccessRow {
  id: string;
  slug: string;
  full_name: string;
  role: string;
  country_code: string | null;
  active: boolean;
  visible_apps: string[] | null;
}

function flagFor(code: string | null): string {
  if (!code) return '🏳';
  const c = code.toUpperCase();
  if (c === 'IT') return '🇮🇹';
  if (c === 'ES') return '🇪🇸';
  if (c === 'UK' || c === 'GB') return '🇬🇧';
  if (c === 'US') return '🇺🇸';
  if (c === 'VE') return '🇻🇪';
  if (c === 'MT') return '🇲🇹';
  return c;
}

export default function AccessiPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/kinora-admin/api/accessi', {
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

  async function toggleAccess(employeeId: string, appId: string, currentlyGranted: boolean) {
    const key = `${employeeId}|${appId}`;
    setSavingKey(key);
    // Optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== employeeId) return r;
        const current = r.visible_apps ?? [];
        const next = currentlyGranted
          ? current.filter((a) => a !== appId)
          : [...current, appId];
        return { ...r, visible_apps: next };
      })
    );
    try {
      const token = await getAccessToken();
      const res = await fetch('/kinora-admin/api/accessi', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId, appId, grant: !currentlyGranted }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Errore ${res.status}`);
      }
    } catch (e) {
      // Roll back optimistic update on failure
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== employeeId) return r;
          const current = r.visible_apps ?? [];
          const restored = currentlyGranted
            ? [...current, appId]
            : current.filter((a) => a !== appId);
          return { ...r, visible_apps: restored };
        })
      );
      setError(e instanceof Error ? e.message : 'Errore aggiornamento');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
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
          <Shield size={22} strokeWidth={2.2} style={{ color: '#10b981' }} />
          Accessi applicativi
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          Spunta o togli la spunta per dare/togliere a ogni dipendente l&apos;accesso
          ai moduli di Kinora.
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
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => setError('')}
            style={{
              float: 'right',
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: 12,
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
          <span>Carico dipendenti…</span>
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              minWidth: 900,
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    position: 'sticky',
                    left: 0,
                    background: '#f8fafc',
                    zIndex: 1,
                  }}
                >
                  Dipendente
                </th>
                {KINORA_APPS.map((app) => (
                  <th
                    key={app.id}
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      minWidth: 92,
                    }}
                  >
                    {app.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    opacity: r.active ? 1 : 0.5,
                  }}
                >
                  <td
                    style={{
                      padding: '10px 14px',
                      position: 'sticky',
                      left: 0,
                      background: '#fff',
                      zIndex: 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{flagFor(r.country_code)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: '#0f172a',
                            fontWeight: 600,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 240,
                          }}
                        >
                          {r.full_name}
                        </div>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {r.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  {KINORA_APPS.map((app) => {
                    const granted = (r.visible_apps ?? []).includes(app.id);
                    const key = `${r.id}|${app.id}`;
                    const isSaving = savingKey === key;
                    return (
                      <td
                        key={app.id}
                        style={{
                          textAlign: 'center',
                          padding: '10px 8px',
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`${granted ? 'Togli' : 'Dai'} accesso a ${app.label} per ${r.full_name}`}
                          disabled={isSaving}
                          onClick={() => toggleAccess(r.id, app.id, granted)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: granted ? 'none' : '1.5px solid #cbd5e1',
                            background: granted
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
                            <Loader2 size={12} className="animate-spin" />
                          ) : granted ? (
                            <Check size={14} strokeWidth={3} />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={1 + KINORA_APPS.length}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 13,
                    }}
                  >
                    Nessun dipendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 14, color: '#94a3b8', fontSize: 12 }}>
        Le modifiche sono <strong>immediate</strong> — vengono scritte nella tabella{' '}
        <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>
          hr.employees.visible_apps
        </code>{' '}
        di Supabase (stessa fonte usata dalla dashboard aziendale).
      </p>
    </div>
  );
}
