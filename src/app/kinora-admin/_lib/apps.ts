import {
  Stethoscope,
  Shield,
  Settings2,
  BookOpen,
  Video,
  FileText,
  Bot,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface AppDef {
  id: string;
  href: string;
  icon: LucideIcon;
  label: string;
  gradient: string;
  sub?: string;
}

/**
 * Single source of truth for the Kinora admin applets.
 * The `id` matches the slug we'll store in hr.employees.visible_apps
 * for per-employee access control.
 */
export const KINORA_APPS: AppDef[] = [
  {
    id: 'kinora-pazienti',
    href: '/kinora-admin/pazienti',
    icon: Stethoscope,
    label: 'Pazienti',
    sub: 'Lista pazienti attivi dal gestionale',
    gradient: 'linear-gradient(135deg, #E85A7A 0%, #322A6E 100%)',
  },
  {
    id: 'kinora-accessi',
    href: '/kinora-admin/accessi',
    icon: Shield,
    label: 'Accessi',
    sub: 'Permessi di accesso per ogni dipendente',
    gradient: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
  },
  {
    id: 'kinora-tier-config',
    href: '/kinora-admin/tier-config',
    icon: Settings2,
    label: 'Tier paziente',
    sub: 'Che cosa vede ogni tier (Free / Self / Care)',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  },
  {
    id: 'kinora-diari',
    href: '/kinora-admin/diari',
    icon: BookOpen,
    label: 'Diari',
    sub: 'Compilazioni quotidiane dei pazienti',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  },
  {
    id: 'kinora-video',
    href: '/kinora-admin/video',
    icon: Video,
    label: 'Video',
    sub: 'Sessioni di terapia caricate dai pazienti',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  },
  {
    id: 'kinora-contratti',
    href: '/kinora-admin/contratti',
    icon: FileText,
    label: 'Contratti',
    sub: 'Impegni riabilitativi attivi',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
  },
  {
    id: 'kinora-agents',
    href: '/kinora-admin/agents',
    icon: Bot,
    label: 'Agents AI',
    sub: 'Assistenti AI condivisi con la dashboard',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  },
  {
    id: 'kinora-configurazione',
    href: '/kinora-admin/configurazione',
    icon: Settings,
    label: 'Configurazione',
    sub: 'Prompt AI, conoscenza clinica, parametri',
    gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
  },
];

const RECENT_KEY = 'kinora-admin-recent';

export function recordUsage(appId: string) {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    const list: string[] = stored ? JSON.parse(stored) : [];
    const next = [appId, ...list.filter((x) => x !== appId)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
