'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  Search,
  Stethoscope,
  KeyRound,
  Check,
  X,
  Copy,
  Eye,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { getAccessToken } from '@/lib/supabase/client';

interface PatientRow {
  id: number | string;
  source: 'gestionale' | 'self-signup';
  auth_uid: string | null;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  city: string | null;
  country_code: string | null;
  marketplace_code: string | null;
  marketplace_name: string | null;
  lesion_type: string | null;
  affected_side: string | null;
  lesion_date: string | null;
  therapist_name: string | null;
  tier: TierValue | null;
  subscription_active: boolean;
  subscription_plan: string | null;
  created_at: string | null;
}

type TierValue = 'free' | 'self' | 'care' | 'studio_nc' | 'studio_tot';

interface TierOverride {
  auth_uid: string;
  tier: TierValue;
  note: string | null;
  updated_at: string;
}

const TIER_BADGE: Record<
  TierValue,
  { bg: string; fg: string; label: string }
> = {
  free: { bg: '#f1f5f9', fg: '#475569', label: 'free' },
  self: { bg: '#ddd6fe', fg: '#5b21b6', label: 'self' },
  care: {
    bg: 'linear-gradient(135deg, #E85A7A 0%, #6B5DA8 100%)',
    fg: '#fff',
    label: 'care',
  },
  studio_nc: { bg: '#0EA5E9', fg: '#fff', label: 'studio NC' },
  studio_tot: { bg: '#10b981', fg: '#fff', label: 'studio TOT' },
};

// matches core_marketplace.code
type Market = 'all' | 'it-ITA' | 'es-INT' | 'other';

function flagFor(code: string | null): string {
  if (!code) return '🏳';
  const c = code.toUpperCase();
  const map: Record<string, string> = {
    IT: '🇮🇹', ES: '🇪🇸', MX: '🇲🇽', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴',
    PE: '🇵🇪', VE: '🇻🇪', EC: '🇪🇨', BO: '🇧🇴', UY: '🇺🇾', PA: '🇵🇦',
    HN: '🇭🇳', GT: '🇬🇹', NI: '🇳🇮', CR: '🇨🇷', DO: '🇩🇴', CU: '🇨🇺',
    PR: '🇵🇷', SV: '🇸🇻', PY: '🇵🇾', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷',
  };
  return map[c] || c;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function generatePassword(): string {
  // 4 letters + 4 digits + special — easy to communicate but strong enough
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) s += digits[Math.floor(Math.random() * digits.length)];
  return s + '!';
}

export default function PazientiPage() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [market, setMarket] = useState<Market>('all');

  // Modale per creazione/reset password
  const [pwdModal, setPwdModal] = useState<{
    patient: PatientRow;
    password: string;
    submitting: boolean;
    result: { action: 'created' | 'reset'; uid: string } | null;
    error: string;
  } | null>(null);

  // Modale "Vivi come": genera un magic link per il paziente e lo
  // mostra con istruzioni per aprirlo in incognito (la sessione admin
  // sopravvive solo se il link viene aperto in un contesto cookie
  // separato).
  const [impersonate, setImpersonate] = useState<{
    patient: PatientRow;
    loading: boolean;
    url: string | null;
    error: string;
    copied: boolean;
    autoCreated: boolean;
  } | null>(null);

  // Mappa auth_uid → tier override. Caricata in parallelo all'elenco pazienti.
  const [overrides, setOverrides] = useState<Map<string, TierOverride>>(new Map());
  const [tierModal, setTierModal] = useState<{
    patient: PatientRow;
    selectedTier: TierValue | 'clear' | null;
    note: string;
    saving: boolean;
    error: string;
  } | null>(null);

  // Carica overrides una volta — gli override sono pochi (uno per
  // paziente con override attivo) quindi non serve cache complessa.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(
          '/kinora-admin/api/pazienti/tier-override',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const m = new Map<string, TierOverride>();
        for (const o of (data.rows as TierOverride[]) || []) {
          m.set(o.auth_uid, o);
        }
        setOverrides(m);
      } catch {
        /* silent */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function effectiveTier(r: PatientRow): {
    tier: TierValue | null;
    isOverride: boolean;
  } {
    if (r.auth_uid) {
      const o = overrides.get(r.auth_uid);
      if (o) return { tier: o.tier, isOverride: true };
    }
    return { tier: r.tier, isOverride: false };
  }

  function openTierModal(patient: PatientRow) {
    if (!patient.auth_uid) {
      alert(
        'Crea o impersona prima il login del paziente — l\'override viene salvato sul Supabase user id.'
      );
      return;
    }
    const existing = overrides.get(patient.auth_uid);
    setTierModal({
      patient,
      selectedTier: existing?.tier ?? null,
      note: existing?.note ?? '',
      saving: false,
      error: '',
    });
  }

  async function submitTierOverride() {
    if (!tierModal) return;
    if (!tierModal.patient.auth_uid) return;
    setTierModal({ ...tierModal, saving: true, error: '' });
    try {
      const token = await getAccessToken();
      const tierPayload =
        tierModal.selectedTier === 'clear' || tierModal.selectedTier === null
          ? null
          : tierModal.selectedTier;
      const res = await fetch(
        '/kinora-admin/api/pazienti/tier-override',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_uid: tierModal.patient.auth_uid,
            tier: tierPayload,
            note: tierModal.note || null,
          }),
        }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Errore ${res.status}`);
      }
      // Aggiorna mappa locale
      setOverrides((prev) => {
        const next = new Map(prev);
        if (tierPayload === null) {
          next.delete(tierModal.patient.auth_uid!);
        } else {
          next.set(tierModal.patient.auth_uid!, {
            auth_uid: tierModal.patient.auth_uid!,
            tier: tierPayload,
            note: tierModal.note || null,
            updated_at: new Date().toISOString(),
          });
        }
        return next;
      });
      setTierModal(null);
    } catch (e) {
      setTierModal({
        ...tierModal,
        saving: false,
        error: e instanceof Error ? e.message : 'Errore',
      });
    }
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(
          `/kinora-admin/api/pazienti?activeOnly=${activeOnly}&market=${market}&limit=1500`,
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
  }, [activeOnly, market]);

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

  function openPwdModal(patient: PatientRow) {
    setPwdModal({
      patient,
      password: generatePassword(),
      submitting: false,
      result: null,
      error: '',
    });
  }

  async function openImpersonate(patient: PatientRow) {
    setImpersonate({
      patient,
      loading: true,
      url: null,
      error: '',
      copied: false,
      autoCreated: false,
    });
    try {
      const token = await getAccessToken();
      const res = await fetch('/kinora-admin/api/pazienti/impersonate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: patient.email,
          redirectTo: '/',
          name: `${patient.first_name} ${patient.last_name}`,
          // Solo per pazienti gestionale; per self-signup id è uno
          // stringid, non un numero — lo lasciamo undefined.
          patientId:
            typeof patient.id === 'number' ? patient.id : undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setImpersonate({
        patient,
        loading: false,
        url: data.url,
        error: '',
        copied: false,
        autoCreated: Boolean(data.autoCreated),
      });
    } catch (e) {
      setImpersonate({
        patient,
        loading: false,
        url: null,
        error: e instanceof Error ? e.message : 'Errore',
        copied: false,
        autoCreated: false,
      });
    }
  }

  async function submitPwd() {
    if (!pwdModal) return;
    setPwdModal({ ...pwdModal, submitting: true, error: '' });
    try {
      const token = await getAccessToken();
      const res = await fetch('/kinora-admin/api/pazienti/login', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: pwdModal.patient.email,
          name: `${pwdModal.patient.first_name} ${pwdModal.patient.last_name}`,
          password: pwdModal.password,
          patientId: pwdModal.patient.id,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setPwdModal({
        ...pwdModal,
        submitting: false,
        result: { action: data.action, uid: data.uid },
        error: '',
      });
    } catch (e) {
      setPwdModal({
        ...pwdModal,
        submitting: false,
        error: e instanceof Error ? e.message : 'Errore',
      });
    }
  }

  function copyCredentials() {
    if (!pwdModal) return;
    const text = `Email: ${pwdModal.patient.email}\nPassword: ${pwdModal.password}\nApp: https://kinora.app/login`;
    navigator.clipboard?.writeText(text).catch(() => {});
  }

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
          {rows.length} pazienti{activeOnly ? ' attivi' : ' totali'}
          {market === 'it-ITA' && ' · mercato Italian Italy'}
          {market === 'es-INT' && ' · mercato Spanish International'}
          {market === 'other' && ' · senza mercato assegnato'}
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
            flex: '1 1 240px',
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
            placeholder="Cerca per nome, email, città…"
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
          {(
            [
              { id: 'all', label: 'Tutti' },
              { id: 'it-ITA', label: '🇮🇹 Italian Italy' },
              { id: 'es-INT', label: '🌎 Spanish International' },
              { id: 'other', label: 'Senza mercato' },
            ] as { id: Market; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMarket(m.id)}
              style={{
                padding: '6px 12px',
                background: market === m.id ? '#6366f1' : 'transparent',
                color: market === m.id ? '#fff' : '#475569',
                border: 'none',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s, color 0.12s',
                whiteSpace: 'nowrap',
              }}
            >
              {m.label}
            </button>
          ))}
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
            overflow: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {[
                  'Paziente',
                  'Email',
                  'Origine',
                  'Tier',
                  'Mercato',
                  'Paese',
                  'Lesione',
                  'Terapista',
                  'Stato',
                  'Login',
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
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: r.source === 'gestionale' ? '#dbeafe' : '#fef3c7',
                          color: r.source === 'gestionale' ? '#1e40af' : '#92400e',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 99,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.source === 'gestionale' ? 'Gestionale' : 'Self-signup'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <TierBadge
                        patient={r}
                        eff={effectiveTier(r)}
                        onClick={() => openTierModal(r)}
                      />
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {r.marketplace_code ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            background:
                              r.marketplace_code === 'it-ITA' ? '#fef3c7' : '#dbeafe',
                            color:
                              r.marketplace_code === 'it-ITA' ? '#92400e' : '#1e40af',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 99,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.marketplace_code === 'it-ITA' ? '🇮🇹 it-ITA' : '🌎 es-INT'}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      <span style={{ fontSize: 16 }}>{flagFor(r.country_code)}</span>{' '}
                      <span style={{ fontSize: 11 }}>{r.country_code || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {r.lesion_type || '—'}
                      {r.affected_side && (
                        <span style={{ color: '#94a3b8' }}> · {r.affected_side}</span>
                      )}
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>
                        {formatDate(r.lesion_date)}
                      </div>
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
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openPwdModal(r)}
                          disabled={!r.email}
                          title={!r.email ? 'Manca email nel gestionale' : 'Crea o resetta accesso'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 10px',
                            background: r.email ? '#eef2ff' : '#f1f5f9',
                            color: r.email ? '#6366f1' : '#94a3b8',
                            border: '1px solid',
                            borderColor: r.email ? '#c7d2fe' : '#e2e8f0',
                            borderRadius: 7,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: r.email ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit',
                            transition: 'background 0.12s',
                          }}
                        >
                          <KeyRound size={12} strokeWidth={2.4} />
                          Crea login
                        </button>
                        <button
                          type="button"
                          onClick={() => openImpersonate(r)}
                          disabled={!r.email}
                          title={
                            !r.email
                              ? 'Manca email — impossibile generare il magic link'
                              : r.auth_uid
                                ? 'Vivi l\'app come questo paziente'
                                : 'Crea silenziosamente l\'account e accedi (zero email al paziente)'
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 10px',
                            background: r.email ? '#fef3c7' : '#f1f5f9',
                            color: r.email ? '#b45309' : '#94a3b8',
                            border: '1px solid',
                            borderColor: r.email ? '#fcd34d' : '#e2e8f0',
                            borderRadius: 7,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: r.email ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit',
                            transition: 'background 0.12s',
                          }}
                        >
                          <Eye size={12} strokeWidth={2.4} />
                          Vivi come
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
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

      {pwdModal && (
        <PwdModal
          state={pwdModal}
          setState={setPwdModal}
          onSubmit={submitPwd}
          onCopy={copyCredentials}
        />
      )}

      {impersonate && (
        <ImpersonateModal
          state={impersonate}
          setState={setImpersonate}
        />
      )}

      {tierModal && (
        <TierModal
          state={tierModal}
          setState={setTierModal}
          onSubmit={submitTierOverride}
        />
      )}
    </div>
  );
}

function TierBadge({
  patient,
  eff,
  onClick,
}: {
  patient: PatientRow;
  eff: { tier: TierValue | null; isOverride: boolean };
  onClick: () => void;
}) {
  const meta = eff.tier ? TIER_BADGE[eff.tier] : null;
  const canEdit = Boolean(patient.auth_uid);

  if (!meta) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!canEdit}
        title={
          canEdit
            ? 'Imposta un tier manualmente'
            : "Servirà prima un login o impersona per associare un tier"
        }
        style={{
          padding: '2px 8px',
          background: '#f8fafc',
          color: '#94a3b8',
          fontSize: 11,
          border: '1px dashed #cbd5e1',
          borderRadius: 99,
          cursor: canEdit ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
        }}
      >
        — assegna
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canEdit}
      title={
        canEdit
          ? eff.isOverride
            ? 'Tier forzato manualmente — clicca per modificare'
            : 'Tier derivato dal gestionale — clicca per forzarlo'
          : "Servirà prima un login o impersona per associare un tier"
      }
      style={{
        padding: '2px 8px',
        background: meta.bg,
        color: meta.fg,
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 99,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        border: 'none',
        cursor: canEdit ? 'pointer' : 'default',
        fontFamily: 'inherit',
        position: 'relative',
      }}
    >
      {meta.label}
      {eff.isOverride && (
        <span
          aria-label="override manuale"
          style={{
            display: 'inline-block',
            marginLeft: 4,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#fff',
            verticalAlign: 'middle',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
          }}
        />
      )}
    </button>
  );
}

function TierModal({
  state,
  setState,
  onSubmit,
}: {
  state: {
    patient: PatientRow;
    selectedTier: TierValue | 'clear' | null;
    note: string;
    saving: boolean;
    error: string;
  };
  setState: (s: typeof state | null) => void;
  onSubmit: () => void;
}) {
  const fullName = `${state.patient.first_name} ${state.patient.last_name}`;
  const tiers: TierValue[] = ['free', 'self', 'care', 'studio_nc', 'studio_tot'];
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={() => !state.saving && setState(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: '#ffffff',
          borderRadius: 12,
          padding: 22,
          boxShadow: '0 24px 60px rgba(15,23,42,0.32)',
          fontFamily: 'inherit',
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontSize: 16,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          Tier override per {fullName}
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
          {state.patient.email}
        </p>

        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#475569' }}>
          Forza un tier specifico (sovrascrive quello derivato dal
          business_status):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {tiers.map((t) => {
            const selected = state.selectedTier === t;
            const meta = TIER_BADGE[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setState({ ...state, selectedTier: t })}
                style={{
                  padding: '6px 12px',
                  background: selected ? meta.bg : '#ffffff',
                  color: selected ? meta.fg : '#0f172a',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderRadius: 99,
                  border: selected
                    ? '2px solid transparent'
                    : '2px solid #e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {meta.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setState({ ...state, selectedTier: 'clear' })}
            style={{
              padding: '6px 12px',
              background: state.selectedTier === 'clear' ? '#fee2e2' : '#ffffff',
              color: state.selectedTier === 'clear' ? '#991b1b' : '#64748b',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: 99,
              border:
                state.selectedTier === 'clear'
                  ? '2px solid #fca5a5'
                  : '2px dashed #cbd5e1',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Rimuovi override
          </button>
        </div>

        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: '#475569',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Nota (opzionale)
        </label>
        <textarea
          value={state.note}
          onChange={(e) => setState({ ...state, note: e.target.value })}
          rows={2}
          placeholder="Es. arruolato nel braccio NC dello studio Resilients, 2026-05-20"
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />

        {state.error && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              color: '#991b1b',
              fontSize: 12,
            }}
          >
            {state.error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 18,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={() => setState(null)}
            disabled={state.saving}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: state.saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={state.saving || state.selectedTier === null}
            style={{
              padding: '8px 14px',
              background: '#322A6E',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor:
                state.saving || state.selectedTier === null
                  ? 'not-allowed'
                  : 'pointer',
              fontFamily: 'inherit',
              opacity: state.selectedTier === null ? 0.5 : 1,
            }}
          >
            {state.saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImpersonateModal({
  state,
  setState,
}: {
  state: {
    patient: PatientRow;
    loading: boolean;
    url: string | null;
    error: string;
    copied: boolean;
    autoCreated: boolean;
  };
  setState: (s: typeof state | null) => void;
}) {
  const fullName = `${state.patient.first_name} ${state.patient.last_name}`;

  async function copyUrl() {
    if (!state.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setState({ ...state, copied: true });
      setTimeout(() => {
        setState({ ...state, copied: false });
      }, 1800);
    } catch {
      /* clipboard may be blocked — user can still long-press the link */
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={() => setState(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          background: '#ffffff',
          borderRadius: 12,
          padding: 22,
          boxShadow: '0 24px 60px rgba(15,23,42,0.32)',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <Eye size={18} style={{ color: '#b45309' }} />
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Vivi come {fullName}
          </h2>
        </div>
        <p style={{ margin: '4px 0 14px', fontSize: 12.5, color: '#475569' }}>
          {state.patient.email}
        </p>

        {state.loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '18px 0',
              color: '#475569',
              fontSize: 13,
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            Genero un link di accesso …
          </div>
        )}

        {state.error && !state.loading && (
          <div
            style={{
              padding: 12,
              background: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              fontSize: 12.5,
            }}
          >
            {state.error}
          </div>
        )}

        {state.url && !state.loading && (
          <>
            {state.autoCreated && (
              <div
                style={{
                  padding: '10px 13px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 8,
                  marginBottom: 10,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: '#065f46',
                }}
              >
                <strong>Account creato silenziosamente.</strong> Nessuna
                email è stata inviata al paziente. La password è random e
                inutilizzabile — il paziente non sa nulla.
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                padding: '11px 13px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                marginBottom: 14,
              }}
            >
              <AlertTriangle
                size={15}
                style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: '#78350f',
                }}
              >
                <strong>Apri il link in una finestra in incognito.</strong> Se
                lo apri nello stesso browser perderai la tua sessione admin
                (il login del paziente sovrascrive i cookie).
              </p>
            </div>

            <div
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, "JetBrains Mono", monospace',
                fontSize: 10.5,
                color: '#334155',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '9px 11px',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                marginBottom: 14,
                maxHeight: 110,
                overflow: 'auto',
              }}
            >
              {state.url}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={copyUrl}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 12px',
                  background: state.copied ? '#dcfce7' : '#f1f5f9',
                  color: state.copied ? '#15803d' : '#0f172a',
                  border: '1px solid',
                  borderColor: state.copied ? '#86efac' : '#cbd5e1',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                }}
              >
                {state.copied ? (
                  <>
                    <Check size={14} />
                    Copiato
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copia link
                  </>
                )}
              </button>
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 12px',
                  background: '#0f172a',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
                Apri in nuova scheda
              </a>
            </div>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 11,
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              Il link è valido per 1 ora ed è single-use.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => setState(null)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function PwdModal({
  state,
  setState,
  onSubmit,
  onCopy,
}: {
  state: {
    patient: PatientRow;
    password: string;
    submitting: boolean;
    result: { action: 'created' | 'reset'; uid: string } | null;
    error: string;
  };
  setState: (s: typeof state | null) => void;
  onSubmit: () => void;
  onCopy: () => void;
}) {
  const fullName = `${state.patient.first_name} ${state.patient.last_name}`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={() => !state.submitting && setState(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 460,
          padding: 24,
          boxShadow: '0 20px 60px -12px rgba(15,23,42,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <KeyRound size={18} style={{ color: '#6366f1' }} />
            Accesso paziente
          </h2>
          <button
            type="button"
            onClick={() => !state.submitting && setState(null)}
            aria-label="Chiudi"
            style={{
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {state.result ? (
          <>
            <div
              style={{
                padding: 14,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 10,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Check size={18} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ color: '#065f46', fontSize: 13, fontWeight: 700 }}>
                  {state.result.action === 'created'
                    ? 'Account creato'
                    : 'Password reimpostata'}
                </div>
                <div style={{ color: '#047857', fontSize: 12, marginTop: 2 }}>
                  Comunica al paziente le credenziali qui sotto. Al login userà la password
                  temporanea, poi potrà cambiarla dal suo profilo.
                </div>
              </div>
            </div>
            <CredentialsBlock email={state.patient.email} password={state.password} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onCopy}
                style={{
                  padding: '10px 14px',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Copy size={13} /> Copia credenziali
              </button>
              <button
                type="button"
                onClick={() => setState(null)}
                style={{
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Chiudi
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Paziente
              </label>
              <div style={{ marginTop: 4, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
                {fullName}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Email
              </label>
              <div style={{ marginTop: 4, fontSize: 14, color: '#0f172a' }}>
                {state.patient.email}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="pwd-input"
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Password temporanea
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  id="pwd-input"
                  type="text"
                  value={state.password}
                  onChange={(e) => setState({ ...state, password: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'monospace',
                    color: '#0f172a',
                    background: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setState({ ...state, password: generatePasswordExt() })
                  }
                  style={{
                    padding: '0 14px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Rigenera
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Almeno 6 caratteri. La password può essere cambiata dal paziente dopo il primo
                login.
              </p>
            </div>
            {state.error && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  color: '#dc2626',
                  fontSize: 12,
                }}
              >
                {state.error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={state.submitting}
                onClick={() => setState(null)}
                style={{
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={state.submitting || state.password.length < 6}
                onClick={onSubmit}
                style={{
                  padding: '10px 14px',
                  background:
                    state.submitting || state.password.length < 6 ? '#cbd5e1' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    state.submitting || state.password.length < 6
                      ? 'not-allowed'
                      : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {state.submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Creo…
                  </>
                ) : (
                  <>Crea / Resetta accesso</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CredentialsBlock({ email, password }: { email: string; password: string }) {
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 14,
        fontFamily: 'monospace',
        fontSize: 13,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Email
        </span>
        <div style={{ color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{email}</div>
      </div>
      <div>
        <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Password
        </span>
        <div style={{ color: '#0f172a', fontWeight: 600, marginTop: 2, fontSize: 16 }}>
          {password}
        </div>
      </div>
    </div>
  );
}

function generatePasswordExt(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) s += digits[Math.floor(Math.random() * digits.length)];
  return s + '!';
}
