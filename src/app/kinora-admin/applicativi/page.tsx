'use client';

import Link from 'next/link';
import { KINORA_APPS, recordUsage } from '../_lib/apps';

export default function ApplicativiPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.3px',
          }}
        >
          Applicativi
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          {KINORA_APPS.length} applicativi disponibili nel dipartimento Kinora.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 18,
        }}
      >
        {KINORA_APPS.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.id}
              href={app.href}
              onClick={() => recordUsage(app.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: '8px',
                textDecoration: 'none',
                transition: 'transform 0.12s',
              }}
              onMouseEnter={(e) => {
                const tile = e.currentTarget.querySelector(
                  '[data-tile]'
                ) as HTMLElement | null;
                if (tile) tile.style.transform = 'scale(1.06)';
              }}
              onMouseLeave={(e) => {
                const tile = e.currentTarget.querySelector(
                  '[data-tile]'
                ) as HTMLElement | null;
                if (tile) tile.style.transform = 'scale(1)';
              }}
            >
              <div
                data-tile
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 22,
                  background: app.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow:
                    '0 12px 24px -8px rgba(15,23,42,0.18), 0 4px 8px -2px rgba(15,23,42,0.08)',
                  transition: 'transform 0.18s ease-out',
                }}
              >
                <Icon size={38} strokeWidth={2} />
              </div>
              <div
                style={{
                  color: '#0f172a',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {app.label}
              </div>
              {app.sub && (
                <div
                  style={{
                    color: '#94a3b8',
                    fontSize: 11,
                    textAlign: 'center',
                    lineHeight: 1.35,
                    maxWidth: 140,
                  }}
                >
                  {app.sub}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
