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
 * Ambiti cognitivi/motori che un modulo allena. Servono per:
 *  - aggregare i punteggi del paziente per area (es. "attenzione
 *    spaziale: media negli ultimi 7 esercizi")
 *  - in futuro: lasciare che la AI suggerisca al paziente quale area
 *    rinforzare ("vedo che la tua attenzione spaziale è un po' più
 *    debole — ti va di provare Neglect-Go?")
 *
 * Aggiungere nuovi domini qui man mano che servono — il valore è una
 * stringa stable (lower_snake_case) per allinearsi col formato che
 * salviamo in kinora.app_score.cognitive_domains.
 */
export type CognitiveDomain =
  | 'attention_spatial'      // attenzione spaziale (neglect, scanning)
  | 'attention_sustained'    // vigilanza, mantenere il focus nel tempo
  | 'working_memory'         // memoria di lavoro
  | 'language_speech'        // logopedia (produzione/comprensione)
  | 'language_reading'       // lettura
  | 'motor_planning'         // pianificazione del movimento (sequenze)
  | 'motor_fine'             // motricità fine (mano, dita)
  | 'motor_gross'            // motricità grossolana (cammino, postura)
  | 'visuospatial'           // ragionamento visuo-spaziale
  | 'executive_function';    // funzioni esecutive (pianificare, inibire)

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
  /**
   * Ambiti che il modulo allena. Letti dai grafici per area + dalla
   * pipeline futura di "suggerimento intelligente" che incrocia i
   * punteggi del paziente con queste tag per consigliare l'app giusta.
   * Optional per backward compatibility coi vecchi manifest di KINORA;
   * i moduli nuovi dovrebbero sempre dichiararli.
   */
  cognitive_domains?: CognitiveDomain[];
};
