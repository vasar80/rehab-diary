'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Users, ShieldOff, Mail } from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';

interface PatientRow {
  uid: string;
  email: string | null;
  name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
}

function timeSince(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days < 30) return `${days}g fa`;
  if (days < 365) return `${Math.floor(days / 30)}m fa`;
  return `${Math.floor(days / 365)}a fa`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PazientiPage() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/kinora-admin/api/pazienti?perPage=100', {
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

  const filtered = query
    ? rows.filter(
        (r) =>
          (r.email || '').toLowerCase().includes(query.toLowerCase()) ||
          (r.name || '').toLowerCase().includes(query.toLowerCase())
      )
    : rows;

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
          Pazienti
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          {rows.length} utenti registrati in Supabase Auth — staff inclusi.
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
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
          placeholder="Cerca per email o nome…"
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
        {query && (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {filtered.length} risultati
          </span>
        )}
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
          <span>Carico utenti…</span>
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
                {[
                  'Utente',
                  'Email',
                  'Ruolo',
                  'Iscritto',
                  'Ultimo login',
                  'Stato',
                ].map((h) => (
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
                const isBanned =
                  r.banned_until && new Date(r.banned_until).getTime() > Date.now();
                const isConfirmed = !!r.email_confirmed_at;
                return (
                  <tr
                    key={r.uid}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
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
                          {(r.name || r.email || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: '#0f172a',
                              fontWeight: 600,
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 200,
                            }}
                          >
                            {r.name || '—'}
                          </div>
                          <div
                            style={{
                              color: '#94a3b8',
                              fontSize: 11,
                              fontFamily: 'monospace',
                            }}
                          >
                            {r.uid.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{r.email}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.role ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            background: r.role === 'admin' ? '#ddd6fe' : '#dbeafe',
                            color: r.role === 'admin' ? '#5b21b6' : '#1e40af',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 99,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {r.role}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {formatDate(r.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {timeSince(r.last_sign_in_at)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {isBanned ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <ShieldOff size={12} /> Bannato
                        </span>
                      ) : !isConfirmed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: '#d97706',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <Mail size={12} /> Email non confermata
                        </span>
                      ) : (
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
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#10b981',
                            }}
                          />
                          Attivo
                        </span>
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
                    Nessun utente corrisponde alla ricerca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
