import type { ModuleManifest } from '@/core/registry/types';

export const walkingManifest: ModuleManifest = {
  slug: 'walking',
  name: { it: 'Cammino', es: 'Marcha', en: 'Walking' },
  short: { it: 'Movimento', es: 'Movimiento', en: 'Movement' },
  category: 'movimento',
  icon: 'walk',
  accent: 'feature',
  gating: { type: 'sessions', freeLimit: 2 },
  status: 'available',
  order: 4,
};
