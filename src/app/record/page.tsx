'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import TypewriterTwoColor from '@/components/TypewriterTwoColor';
import { moduleRegistry } from '@/core/registry/registry';
import type { CognitiveDomain } from '@/core/registry/types';

/**
 * /record — "I tuoi record"
 *
 * Pagina paziente che mostra:
 *   - Per ogni app, i record personali (best per metric, totale sessioni)
 *   - Per ogni area cognitiva, conteggio sessioni recenti
 *
 * Consuma GET /api/me/app-score. Empty state quando nessuno score è
 * stato ancora salvato — comunica chiaramente cosa apparira'' qui man
 * mano che il paziente fa gli esercizi.
 */

interface ScoreRow {
  id: number;
  app_slug: string;
  metric: string;
  value: number;
  cognitive_domains: string[];
  recorded_at: string;
  metadata: Record<string, unknown> | null;
}

const PINK = '#E85A7A';
const VIOLET = '#322A6E';

function TwoColorInline({ text }: { text: string }) {
  if (!text) return null;
  return (
    <>
      <span style={{ color: PINK }}>{text.charAt(0)}</span>
      <span style={{ color: VIOLET }}>{text.slice(1)}</span>
    </>
  );
}

const DOMAIN_LABEL: Record<CognitiveDomain, string> = {
  attention_spatial: 'Attenzione spaziale',
  attention_sustained: 'Attenzione sostenuta',
  working_memory: 'Memoria di lavoro',
  language_speech: 'Linguaggio',
  language_reading: 'Lettura',
  motor_planning: 'Pianificazione motoria',
  motor_fine: 'Motricità fine',
  motor_gross: 'Motricità grossolana',
  visuospatial: 'Visuo-spaziale',
  executive_function: 'Funzioni esecutive',
};

const METRIC_LABEL: Record<string, string> = {
  completion_ms: 'Miglior tempo',
  level: 'Livello massimo',
  targets_found: 'Target trovati',
  accuracy_pct: 'Accuratezza',
  session_count: 'Sessioni',
};

function formatMs(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = (s % 60).toFixed(0).padStart(2, '0');
  return `${m}:${r}`;
}

function formatValue(metric: string, value: number): string {
  if (metric === 'completion_ms') return formatMs(value);
  if (metric === 'accuracy_pct') return `${value.toFixed(0)}%`;
  return String(value);
}

export default function RecordPage() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sess } = await supabase().auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          if (mounted) {
            setAuthed(false);
            setLoading(false);
          }
          return;
        }
        if (mounted) setAuthed(true);
        const res = await fetch('/api/me/app-score?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (mounted) setRows((body.rows as ScoreRow[]) || []);
      } catch (err) {
        console.warn('Failed to load app scores:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Aggregations: per-app records + per-domain session counts.
  const perApp = new Map<
    string,
    { best: Map<string, number>; sessions: number; lastAt: string | null }
  >();
  const perDomain = new Map<string, number>();

  for (const row of rows) {
    let bucket = perApp.get(row.app_slug);
    if (!bucket) {
      bucket = { best: new Map(), sessions: 0, lastAt: null };
      perApp.set(row.app_slug, bucket);
    }
    // Best per metric — completion_ms = lowest wins, others = highest
    const isLowerBetter = row.metric === 'completion_ms';
    const cur = bucket.best.get(row.metric);
    if (cur === undefined || (isLowerBetter ? row.value < cur : row.value > cur)) {
      bucket.best.set(row.metric, row.value);
    }
    if (row.metric === 'session_count' || row.metric === 'level') {
      bucket.sessions += 1;
    } else {
      bucket.sessions += 1; // each row is a session-level event
    }
    if (!bucket.lastAt || row.recorded_at > bucket.lastAt) {
      bucket.lastAt = row.recorded_at;
    }

    for (const dom of row.cognitive_domains) {
      perDomain.set(dom, (perDomain.get(dom) || 0) + 1);
    }
  }

  const totalSessions = rows.length;

  return (
    <main
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '32px 20px 60px',
        minHeight: '100dvh',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#9088a8',
          marginBottom: 8,
        }}
      >
        Profilo
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.0,
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        <TypewriterTwoColor text="I tuoi record" speed={28} />
      </h1>
      <p
        style={{
          marginTop: 14,
          fontSize: 15,
          lineHeight: 1.55,
          color: '#57516e',
        }}
      >
        Le migliori prestazioni in ogni esercizio + i tuoi progressi per area
        cognitiva. I record si aggiornano in tempo reale man mano che giochi.
      </p>

      {loading && (
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#9088a8',
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          <span>Carico…</span>
        </div>
      )}

      {!loading && authed === false && (
        <EmptyCard
          headline="Accedi per vedere i tuoi record"
          body="I record sono legati al tuo profilo. Una volta fatto il login potrai vedere qui i tuoi miglioramenti."
          cta={{ href: '/login', label: 'Vai al login' }}
        />
      )}

      {!loading && authed && rows.length === 0 && (
        <EmptyCard
          headline="Ancora nessun record"
          body="Inizia un esercizio: i tuoi punteggi, i record personali e i progressi per area cognitiva appariranno qui in tempo reale."
          cta={{ href: '/apps', label: 'Vedi gli esercizi' }}
          preview
        />
      )}

      {!loading && authed && rows.length > 0 && (
        <>
          {/* Per app */}
          <section style={{ marginTop: 36 }}>
            <h2 style={sectionTitle}>
              <Sparkles size={16} style={{ color: PINK, marginRight: 6 }} />
              <span style={{ color: VIOLET }}>Per app</span>
            </h2>
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {Array.from(perApp.entries()).map(([slug, bucket]) => {
                const mod = moduleRegistry.find((m) => m.slug === slug);
                const title = mod?.name.it ?? slug;
                return (
                  <div
                    key={slug}
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(231, 229, 240, 0.8)',
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily:
                            'var(--font-playfair), "Playfair Display", Georgia, serif',
                          fontSize: 20,
                          fontWeight: 700,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <TwoColorInline text={title} />
                      </p>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#9088a8',
                          fontWeight: 600,
                        }}
                      >
                        {bucket.sessions} sessioni
                      </span>
                    </div>
                    {bucket.best.size === 0 ? (
                      <p
                        style={{ margin: 0, fontSize: 13, color: '#9088a8' }}
                      >
                        Nessun record dettagliato.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {Array.from(bucket.best.entries()).map(([metric, val]) => (
                          <div key={metric}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 10.5,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#9088a8',
                              }}
                            >
                              {METRIC_LABEL[metric] || metric}
                            </p>
                            <p
                              style={{
                                margin: '2px 0 0',
                                fontSize: 22,
                                fontWeight: 700,
                                color: '#14102F',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatValue(metric, val)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Per area cognitiva */}
          {perDomain.size > 0 && (
            <section style={{ marginTop: 36 }}>
              <h2 style={sectionTitle}>
                <TrendingUp size={16} style={{ color: PINK, marginRight: 6 }} />
                <span style={{ color: VIOLET }}>Per area allenata</span>
              </h2>
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {Array.from(perDomain.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([dom, n]) => {
                    const max = Math.max(...Array.from(perDomain.values()));
                    const pct = (n / max) * 100;
                    return (
                      <div
                        key={dom}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 130,
                            fontSize: 13,
                            color: '#14102F',
                          }}
                        >
                          {DOMAIN_LABEL[dom as CognitiveDomain] || dom}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: 'rgba(20,16,47,0.06)',
                            borderRadius: 999,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${PINK}, ${VIOLET})`,
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            width: 32,
                            fontSize: 12,
                            fontVariantNumeric: 'tabular-nums',
                            color: '#57516e',
                            textAlign: 'right',
                          }}
                        >
                          {n}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <p
                style={{
                  marginTop: 18,
                  fontSize: 12,
                  color: '#9088a8',
                  fontStyle: 'italic',
                }}
              >
                {totalSessions} sessioni totali · ogni esercizio allena 1-3 aree
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: '-0.01em',
};

function EmptyCard({
  headline,
  body,
  cta,
  preview = false,
}: {
  headline: string;
  body: string;
  cta: { href: string; label: string };
  preview?: boolean;
}) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: 24,
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(231, 229, 240, 0.8)',
        borderRadius: 18,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        <TwoColorInline text={headline} />
      </p>
      <p
        style={{
          marginTop: 10,
          fontSize: 14,
          lineHeight: 1.5,
          color: '#57516e',
        }}
      >
        {body}
      </p>
      {preview && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            background: 'rgba(232, 90, 122, 0.06)',
            border: '1px dashed rgba(232, 90, 122, 0.3)',
            borderRadius: 12,
            textAlign: 'left',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: PINK,
            }}
          >
            Cosa apparirà qui
          </p>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 18px',
              fontSize: 13,
              color: '#57516e',
              lineHeight: 1.6,
            }}
          >
            <li>Miglior tempo / livello per ogni esercizio</li>
            <li>Numero di sessioni e streak</li>
            <li>Bilancio per area cognitiva allenata (attenzione spaziale, motor planning, …)</li>
          </ul>
        </div>
      )}
      <Link
        href={cta.href}
        style={{
          marginTop: 22,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 44,
          padding: '0 22px',
          borderRadius: 12,
          background: VIOLET,
          color: '#ffffff',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        <Sparkles size={14} />
        {cta.label}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
