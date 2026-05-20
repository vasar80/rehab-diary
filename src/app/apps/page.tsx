import Link from 'next/link';
import { availableModules } from '@/core/registry/registry';
import { routing } from '@/i18n/routing';

/**
 * Lista degli applicativi disponibili.
 *
 * Legge il registry dei moduli (`src/core/registry/registry.ts`) e li
 * stampa tutti. Non fa ancora gating per tier — il gating va legato a
 * `kinora.tier_feature` (slug `app_walking`, `app_neglect_go`) lato
 * server o tramite hook lato client quando avremo l'auth paziente
 * cablata sul flusso.
 *
 * I link vanno a `/apps/[slug]`. Il modulo aperto userà il suo back
 * link interno (Link href={`/${locale}`}) che punta a `/it` — lì
 * c'è una piccola pagina-ponte che reindirizza a `/apps`.
 */
export default function AppsListPage() {
  const locale = routing.defaultLocale;
  const modules = availableModules();

  return (
    <main className="px-5 py-8 max-w-md mx-auto">
      <p className="eyebrow mb-3">Esercizi</p>
      <h1 className="font-display font-bold italic text-[36px] leading-[1.0] tracking-[-0.02em] text-ink">
        Le tue app
      </h1>
      <p className="mt-3 text-[15px] text-ink-2 leading-relaxed">
        Esercizi pensati per il tuo recupero. Apri quello che ti incuriosisce —
        si gioca dove sei, quanto vuoi.
      </p>

      <ul className="mt-7 space-y-3">
        {modules.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/apps/${m.slug}`}
              className="block rounded-[16px] p-4 active:scale-[0.99]"
              style={{
                background: 'var(--color-paper)',
                border: '1px solid var(--ink-line)',
                boxShadow: 'var(--shadow-1)',
                transition: 'transform var(--dur-quick) var(--ease-snap)',
              }}
            >
              <p className="eyebrow mb-1">{m.short[locale]}</p>
              <p className="font-display font-bold italic text-[22px] tracking-[-0.015em] leading-[1.05] text-ink">
                {m.name[locale]}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center font-mono text-[11px] tracking-[0.06em] text-ink-mute">
        {modules.length} app · trasferite da KINORA standalone
      </p>
    </main>
  );
}
