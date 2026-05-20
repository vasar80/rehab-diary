/**
 * Image config for the Walking module.
 *
 * The source asset is a single image containing all canonical frames
 * laid out horizontally and equidistant. The component uses CSS
 * background-position to show one slice per card — no cropping needed.
 *
 * To replace with a new image:
 *   1. Drop the file into public/modules/walking/
 *   2. Update `src` below
 *   3. Update `aspectRatio` if the per-frame proportions change
 */

import { TOTAL_FRAMES } from './poses';

export const FRAMES_IMAGE = {
  /** Path relative to /public. Must match the file dropped in /public/modules/walking. */
  src: '/modules/walking/cycle.png',

  /** How many frames the image contains, side by side. Must equal TOTAL_FRAMES. */
  totalFrames: TOTAL_FRAMES,

  /**
   * Aspect ratio of a single frame within the image (width / height).
   * Current asset: 2143x496 → per frame ~306x496 → 0.617.
   * Tweak if you swap the asset for one with different proportions.
   */
  perFrameAspect: '306 / 496',

  /** A friendly fallback color shown if the image fails to load. */
  fallbackBg: '#f5f3ee',
} as const;
