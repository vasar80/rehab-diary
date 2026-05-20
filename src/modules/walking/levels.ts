/**
 * Level system for the Walking module.
 *
 *   L1 → 3 consecutive frames    (easy)
 *   L2 → 4 consecutive frames
 *   L3 → 5 consecutive frames
 *   L4 → 6 consecutive frames
 *   L5 → 7 consecutive frames    (full canonical sequence)
 *
 * "Consecutive" means a contiguous slice of CANONICAL_ORDER. The starting
 * offset is randomised within the valid range for the level size — at L1
 * there are 5 possible starts, at L5 only one.
 */

import { CANONICAL_ORDER, TOTAL_FRAMES, type FrameId } from './poses';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

/** L1 → 3, L2 → 4, …, L5 → 7. Clamped for safety. */
export function levelSize(level: number): number {
  return Math.max(3, Math.min(TOTAL_FRAMES, level + 2));
}

/**
 * Pick a random consecutive slice of the canonical sequence sized for the level.
 * Returns the slice in canonical (correct) order — caller is responsible for
 * shuffling it for the user to reorder.
 */
export function pickLevelFrames(level: number): FrameId[] {
  const size = levelSize(level);
  const maxStart = TOTAL_FRAMES - size;
  const start = Math.floor(Math.random() * (maxStart + 1));
  return CANONICAL_ORDER.slice(start, start + size);
}

/**
 * Fisher-Yates shuffle. Re-attempts up to 5 times if the result equals the
 * canonical order, so the user always starts from a non-trivial state.
 */
export function shuffleLevelFrames(canonical: readonly FrameId[]): FrameId[] {
  const arr = [...canonical];
  if (arr.length <= 1) return arr;

  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    attempts++;
  } while (attempts < 5 && arr.every((id, i) => id === canonical[i]));
  return arr;
}

/** Strict equality: the user's current order must match the level's canonical slice. */
export function isLevelCorrect(
  canonical: readonly FrameId[],
  current: readonly FrameId[],
): boolean {
  if (current.length !== canonical.length) return false;
  return current.every((id, i) => id === canonical[i]);
}
