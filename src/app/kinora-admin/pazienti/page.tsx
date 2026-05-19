'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Stethoscope } from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';

interface PatientRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  city: string | null;
  country_id: number | null;
  lesion_type: string | null;
  affected_side: string | null;
  lesion_date: string | null;
  therapist_name: string | null;
  subscription_active: boolean;
  subscription_plan: string | null;
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
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(
          `/kinora-admin/api/pazienti?activeOnly=${activeOnly}&limit=500`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
  }, [activeOnly]);

  const filtered = query
    ? rows.filter((r) => {
        const q = query.toLowerCase();
        return (
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q) ||
          (r.city || '').toLowerCase().includes(q)
        );
      })
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
          <Stethoscope size={22} strokeWidth={2.2} style={{ color: '#E85A7A' }} />
          Pazienti
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          {rows.length} pazienti{activeOnly ? ' attivi' : ' totali'} · dal gestionale Resilients
        </p>
      </header>

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
            placeholder="Cerca per nome, cognome, email, città…"
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
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            color: '#475569',
            fontWeight: 500,
          }}
        >
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            style={{ accentColor: '#6366f1', cursor: 'pointer' }}
          />
          Solo attivi
        </label>
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
          <span>Carico pazienti…</span>
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
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Paziente', 'Email', 'Lesione', 'Data evento', 'Terapista', 'Stato'].map((h) => (
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
                const initials =
                  `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase() || '·';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #E85A7A 0%, #6B5DA8 100%)',
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
                            {r.first_name} {r.last_name}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: 11 }}>
                            {r.city || '—'} · {r.gender || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                      {r.email}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {r.lesion_type || '—'}
                      {r.affected_side && (
                        <span style={{ color: '#94a3b8' }}> · {r.affected_side}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {formatDate(r.lesion_date)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {r.therapist_name || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.subscription_active ? (
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
                          {r.subscription_plan && (
                            <span
                              style={{
                                marginLeft: 4,
                                color: '#94a3b8',
                                fontWeight: 500,
                                fontSize: 11,
                              }}
                            >
                              · {r.subscription_plan}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Inattivo</span>
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
                    Nessun paziente corrisponde ai filtri.
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
