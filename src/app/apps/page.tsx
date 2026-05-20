'use client';

import Link from 'next/link';
import { availableModules } from '@/core/registry/registry';
import { routing } from '@/i18n/routing';
import TypewriterTwoColor from '@/components/TypewriterTwoColor';

/**
 * Lista degli applicativi disponibili.
 *
 * Stile: identità visiva del core rehab-diary.
 *  - titoli con TypewriterTwoColor (prima lettera pink #E85A7A,
 *    resto violet #322A6E)
 *  - font Playfair Display per il titolo, Inter per il corpo
 *  - background trasparente: il gradiente radiale violet/pink del
 *    body del core trasparisce dietro le card
 *
 * I link puntano a /apps/[slug]. Il modulo aperto userà il back link
 * `/${locale}` → c'è la pagina-ponte `/it/page.tsx` che reindirizza a
 * /apps.
 */

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

export default function AppsListPage() {
  const locale = routing.defaultLocale;
  const modules = availableModules();

  return (
    <main
      style={{
        padding: '40px 20px 60px',
        maxWidth: 480,
        margin: '0 auto',
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
        Esercizi
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
        <TypewriterTwoColor text="I tuoi esercizi" speed={28} />
      </h1>
      <p
        style={{
          marginTop: 14,
          fontSize: 15,
          lineHeight: 1.55,
          color: '#57516e',
          fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        }}
      >
        Esercizi pensati per il tuo recupero. Apri quello che ti incuriosisce —
        si gioca dove sei, quanto vuoi.
      </p>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '32px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {modules.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/apps/${m.slug}`}
              style={{
                display: 'block',
                padding: 18,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(231, 229, 240, 0.8)',
                borderRadius: 18,
                boxShadow:
                  '0 1px 0 rgba(20,16,47,0.04), 0 8px 20px -10px rgba(20,16,47,0.10)',
                textDecoration: 'none',
                transition: 'transform 140ms ease',
              }}
            >
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#9088a8',
                  margin: 0,
                  marginBottom: 4,
                  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
                }}
              >
                {m.short[locale]}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                <TwoColorInline text={m.name[locale]} />
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <Link
          href="/record"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 42,
            padding: '0 18px',
            borderRadius: 12,
            background: 'transparent',
            border: '1px solid rgba(20, 16, 47, 0.18)',
            color: '#322A6E',
            fontWeight: 600,
            fontSize: 13,
            textDecoration: 'none',
            fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
          }}
        >
          Vedi i tuoi record →
        </Link>
      </div>

      <p
        style={{
          marginTop: 18,
          textAlign: 'center',
          fontSize: 11,
          color: '#9088a8',
          letterSpacing: '0.06em',
          fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        }}
      >
        {modules.length} app · presto molte di più
      </p>
    </main>
  );
}
