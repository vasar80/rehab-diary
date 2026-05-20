import type { ModuleManifest } from '@/core/registry/types';

export const neglectGoManifest: ModuleManifest = {
  slug: 'neglect-go',
  name: { it: 'Neglect Go', es: 'Neglect Go', en: 'Neglect Go' },
  short: { it: 'Esplora lo spazio', es: 'Explora el espacio', en: 'Explore space' },
  category: 'neglect',
  icon: 'compass',
  accent: 'warm',
  gating: { type: 'sessions', freeLimit: 2 },
  status: 'available',
  order: 5,
};
