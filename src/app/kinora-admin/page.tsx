'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { KINORA_APPS, recordUsage, getRecent, type AppDef } from './_lib/apps';

export default function KinoraAdminOverview() {
  const { supabaseUser } = useAuth();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  const name =
    ((supabaseUser?.user_metadata as Record<string, unknown> | null)?.name as string) ||
    supabaseUser?.email?.split('@')[0] ||
    'Staff';
  const firstName = (name || '').split(' ')[0];
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  const recentApps: AppDef[] = recent
    .map((id) => KINORA_APPS.find((a) => a.id === id))
    .filter((a): a is AppDef => !!a);
  const showRecent = recentApps.length > 0 ? recentApps : KINORA_APPS.slice(0, 4);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.5px',
          }}
        >
          {greet}, {firstName}
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
          Pannello di amministrazione di Kinora.
        </p>
      </header>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              margin: 0,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {recentApps.length > 0 ? 'Usati di recente' : 'Inizia da qui'}
          </h2>
          <Link
            href="/kinora-admin/applicativi"
            style={{
              padding: '4px 10px',
              background: '#eef2ff',
              color: '#6366f1',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 99,
              textDecoration: 'none',
            }}
          >
            Vedi tutti →
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollSnapType: 'x mandatory',
          }}
        >
          {showRecent.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                href={app.href}
                onClick={() => recordUsage(app.id)}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 12px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  width: 130,
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  textDecoration: 'none',
                  transition: 'transform 0.12s, box-shadow 0.12s, border-color 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.08)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: app.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
                  }}
                >
                  <Icon size={28} strokeWidth={2.2} />
                </div>
                <div
                  style={{
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {app.label}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
