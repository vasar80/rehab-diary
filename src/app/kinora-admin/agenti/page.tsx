'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Save, Check } from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';

interface AgentRow {
  tier: string;
  display_name: string;
  system_prompt: string;
  model: string;
  knowledge_base: string | null;
  notes: string | null;
  updated_at: string;
}

const TIER_META: Record<
  string,
  { label: string; color: string; sub: string }
> = {
  free: {
    label: 'Free',
    color: '#9088a8',
    sub: 'Accesso limitato, paziente curioso',
  },
  self: {
    label: 'Self',
    color: '#6B5DA8',
    sub: 'Abbonato autonomo, senza team clinico',
  },
  care: {
    label: 'Care',
    color: '#322A6E',
    sub: 'Premium con team Resilients dietro',
  },
  studio_nc: {
    label: 'Studio NC',
    color: '#0EA5E9',
    sub: 'Partecipante studio scientifico neurocognitivo',
  },
  studio_tot: {
    label: 'Studio TOT',
    color: '#10b981',
    sub: 'Partecipante studio scientifico task-oriented',
  },
};

export default function AgentiPage() {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Partial<AgentRow>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/kinora-admin/api/agenti', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Errore ${res.status}`);
        }
        const data = await res.json();
        if (!mounted) return;
        setRows((data.rows as AgentRow[]) || []);
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

  function updateDraft(tier: string, patch: Partial<AgentRow>) {
    setDrafts((d) => ({ ...d, [tier]: { ...d[tier], ...patch } }));
  }

  function effective(row: AgentRow): AgentRow {
    return { ...row, ...drafts[row.tier] };
  }

  function hasChanges(row: AgentRow): boolean {
    const d = drafts[row.tier];
    if (!d) return false;
    return Object.entries(d).some(
      ([k, v]) => (row as unknown as Record<string, unknown>)[k] !== v
    );
  }

  async function save(tier: string) {
    const draft = drafts[tier];
    if (!draft) return;
    setSaving(tier);
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/kinora-admin/api/agenti', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, ...draft }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Errore ${res.status}`);
      }
      // Apply draft to rows + clear it
      setRows((rs) =>
        rs.map((r) => (r.tier === tier ? ({ ...r, ...draft } as AgentRow) : r))
      );
      setDrafts((d) => {
        const next = { ...d };
        delete next[tier];
        return next;
      });
      setSavedTier(tier);
      setTimeout(() => {
        setSavedTier((s) => (s === tier ? null : s));
      }, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore salvataggio');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={20} style={{ color: '#E85A7A' }} />
          <span>
            <span style={{ color: '#E85A7A' }}>A</span>
            <span style={{ color: '#322A6E' }}>genti AI per tier</span>
          </span>
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: '#57516e',
            lineHeight: 1.5,
          }}
        >
          Ogni tier ha un proprio agente conversazionale. Modifica il{' '}
          <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 5 }}>
            system_prompt
          </code>
          , il modello e la knowledge base. Le modifiche sono attive da subito.
        </p>
      </header>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            padding: 40,
            color: '#9088a8',
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          Carico…
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {rows.map((row) => {
            const eff = effective(row);
            const changed = hasChanges(row);
            const meta = TIER_META[row.tier] || {
              label: row.tier,
              color: '#9088a8',
              sub: '',
            };
            return (
              <div
                key={row.tier}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: meta.color,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: meta.color,
                      }}
                    >
                      Tier {meta.label}
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 12,
                        color: '#94a3b8',
                      }}
                    >
                      {meta.sub}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => save(row.tier)}
                    disabled={!changed || saving === row.tier}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 34,
                      padding: '0 14px',
                      borderRadius: 8,
                      background:
                        savedTier === row.tier
                          ? '#dcfce7'
                          : changed
                            ? '#322A6E'
                            : '#f1f5f9',
                      color:
                        savedTier === row.tier
                          ? '#15803d'
                          : changed
                            ? '#ffffff'
                            : '#94a3b8',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: changed && saving !== row.tier ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      transition: 'background 0.12s',
                    }}
                  >
                    {savedTier === row.tier ? (
                      <>
                        <Check size={13} />
                        Salvato
                      </>
                    ) : saving === row.tier ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Salvo…
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        Salva
                      </>
                    )}
                  </button>
                </div>

                <div style={{ padding: 18 }}>
                  <Field label="Nome dell'agente">
                    <input
                      type="text"
                      value={eff.display_name ?? ''}
                      onChange={(e) =>
                        updateDraft(row.tier, { display_name: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Modello AI">
                    <input
                      type="text"
                      value={eff.model ?? ''}
                      placeholder="gemini-1.5-flash"
                      onChange={(e) =>
                        updateDraft(row.tier, { model: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="System prompt">
                    <textarea
                      value={eff.system_prompt ?? ''}
                      onChange={(e) =>
                        updateDraft(row.tier, { system_prompt: e.target.value })
                      }
                      rows={9}
                      style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12.5, lineHeight: 1.55 }}
                    />
                  </Field>

                  <Field label="Knowledge base (opzionale, blob testuale o link)">
                    <textarea
                      value={eff.knowledge_base ?? ''}
                      onChange={(e) =>
                        updateDraft(row.tier, { knowledge_base: e.target.value })
                      }
                      rows={3}
                      placeholder="Per ora testo libero o URL — in futuro qui collegheremo i documenti pgvector."
                      style={{ ...inputStyle, fontSize: 12.5 }}
                    />
                  </Field>

                  <Field label="Note interne (non viste dal paziente)">
                    <textarea
                      value={eff.notes ?? ''}
                      onChange={(e) =>
                        updateDraft(row.tier, { notes: e.target.value })
                      }
                      rows={2}
                      style={{ ...inputStyle, fontSize: 12.5 }}
                    />
                  </Field>

                  <p
                    style={{
                      marginTop: 6,
                      fontSize: 10.5,
                      color: '#9088a8',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Ultimo aggiornamento:{' '}
                    {row.updated_at
                      ? new Date(row.updated_at).toLocaleString('it-IT')
                      : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: '#0f172a',
  background: '#ffffff',
  resize: 'vertical',
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#475569',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
