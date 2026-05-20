import type { ModuleManifest } from './types';
import { walkingManifest } from '@/modules/walking/manifest';
import { neglectGoManifest } from '@/modules/neglect-go/manifest';

/**
 * Central module registry.
 *
 * Trasferito dal progetto KINORA standalone. Per ora ospita solo i due
 * moduli "regalo" per i pazienti free (Walking e Neglect-Go). Sono copie
 * letterali — qualsiasi cambiamento qui o nelle altre aree dell'app
 * NON deve toccare il sorgente dei moduli.
 *
 * Per aggiungere un nuovo applicativo:
 *   1. Crea src/modules/<slug>/manifest.ts (+ il componente)
 *   2. Importa il manifest qui
 *   3. Inseriscilo nell'array
 *
 * Il guscio (`/apps`, `/apps/[slug]`) legge questo registry per
 * costruire la UI: non serve toccare il guscio per aggiungere moduli.
 */
export const moduleRegistry: ModuleManifest[] = [
  walkingManifest,
  neglectGoManifest,
].sort((a, b) => a.order - b.order);

export function findModule(slug: string): ModuleManifest | undefined {
  return moduleRegistry.find((m) => m.slug === slug);
}

export function availableModules(): ModuleManifest[] {
  return moduleRegistry.filter((m) => m.status === 'available');
}
