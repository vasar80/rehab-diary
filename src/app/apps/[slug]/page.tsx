import type { ComponentType } from 'react';
import { notFound } from 'next/navigation';
import { findModule, moduleRegistry } from '@/core/registry/registry';
import { Walking } from '@/modules/walking/Walking';
import { NeglectGo } from '@/modules/neglect-go/NeglectGo';

/**
 * Entry-point dinamico per ogni applicativo.
 *
 * Trasferito 1:1 dal progetto KINORA (`app/[locale]/apps/[slug]/page.tsx`)
 * ma SENZA il segmento `[locale]`: rehab-diary è italiano-only per ora,
 * la locale è fissata nel layout `/apps/layout.tsx`.
 *
 * Per aggiungere un nuovo modulo:
 *   1. crea `src/modules/<slug>/manifest.ts` + il componente
 *   2. registralo in `src/core/registry/registry.ts`
 *   3. aggiungilo qui sotto nella mappa `components`
 */
const components: Record<string, ComponentType> = {
  walking: Walking,
  'neglect-go': NeglectGo,
};

export function generateStaticParams() {
  return moduleRegistry.map((mod) => ({ slug: mod.slug }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = findModule(slug);
  if (!mod) notFound();

  const Component = components[slug];
  if (!Component) {
    // Manifest registrato ma componente non ancora wired — placeholder.
    return (
      <div className="px-6 py-12 max-w-md mx-auto text-center">
        <p className="eyebrow mb-2">In arrivo</p>
        <h1 className="font-display font-bold italic text-[28px] tracking-[-0.02em] text-ink">
          {mod.name.it}
        </h1>
        <p className="mt-3 text-[14px] text-ink-2">
          Questo modulo è registrato ma non ancora collegato.
        </p>
      </div>
    );
  }

  return <Component />;
}
