import type { Locale } from '@/i18n/routing';

/**
 * Categories of applicatives. Aligned with Categories messages keys.
 */
export type ModuleCategory =
  | 'logopedia'
  | 'memoria'
  | 'movimento'
  | 'cognitivo'
  | 'ascolto'
  | 'neglect';

/**
 * Freemium gating strategies.
 *
 * - sessions: user can do N free sessions then login wall
 * - levels:   user can complete N free levels then login wall
 * - time:     user can use the module for N minutes total
 * - free:     fully free, no gating (utilities, info)
 * - paywall:  fully premium, login required from the start
 */
export type ModuleGating =
  | { type: 'sessions'; freeLimit: number }
  | { type: 'levels'; freeLimit: number }
  | { type: 'time'; freeMinutes: number }
  | { type: 'free' }
  | { type: 'paywall' };

export type LocalizedString = Record<Locale, string>;

/**
 * The visual accent slot for the module card on the home grid.
 * Maps onto the Editorial Healthtech palette in DESIGN.md.
 *
 * - feature: terracotta surface, used at most ONCE per home (the highlighted next exercise)
 * - paper:   neutral paper card, the default
 * - warm:    soft amber-tinted card for secondary emphasis
 * - ink:     dark ink surface for premium / paywalled modules
 */
export type ModuleAccent = 'feature' | 'paper' | 'warm' | 'ink';

export type ModuleIconKey =
  | 'crossword'
  | 'image'
  | 'audiobook'
  | 'walk'
  | 'compass';

/**
 * Module manifest — the single source of truth for an applicative.
 * Add a new module by creating its manifest and registering it.
 */
export type ModuleManifest = {
  /** url-safe id, used in routes (/apps/[slug]) */
  slug: string;
  name: LocalizedString;
  short: LocalizedString;
  category: ModuleCategory;
  icon: ModuleIconKey;
  accent: ModuleAccent;
  gating: ModuleGating;
  /** whether the module is currently shippable */
  status: 'available' | 'coming-soon';
  /** order in the home/library grid (lower = first) */
  order: number;
};
