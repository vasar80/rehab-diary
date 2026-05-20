'use client';

/**
 * Lives hook for the Walking module.
 *
 *   • 5 lives max
 *   • Lose 1 life on a wrong "Verifica" attempt
 *   • Lost lives regenerate one at a time, every 30 minutes
 *   • State persists across reloads via localStorage
 *
 * The regeneration timer is anchored to wall-clock time, so a user who
 * closes the app with 2 lives and a 12-minute timer will return later
 * with the correct accumulated regen — including lives that should have
 * been added while they were away.
 *
 * A 1 Hz tick re-renders consumers so the countdown text stays fresh.
 */

import { useCallback, useEffect, useState } from 'react';

export const MAX_LIVES = 5;
const REGEN_MS = 30 * 60 * 1000; // 30 minutes per life

const STORAGE_KEY = 'kinora.walking.lives';

type Stored = {
  lives: number;
  /** Wall-clock ms when the *next* life will appear. Null when full. */
  nextRegenAt: number | null;
};

const FULL: Stored = { lives: MAX_LIVES, nextRegenAt: null };

function load(): Stored {
  if (typeof window === 'undefined') return FULL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return FULL;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      lives: clamp(parsed.lives ?? MAX_LIVES, 0, MAX_LIVES),
      nextRegenAt:
        typeof parsed.nextRegenAt === 'number' ? parsed.nextRegenAt : null,
    };
  } catch {
    return FULL;
  }
}

function save(s: Stored): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode: silently ignore */
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Apply any pending regenerations based on wall-clock time. Pure function so
 * it can be reused on hydrate, on tick, and (defensively) on lose.
 */
function applyRegen(s: Stored, now: number): Stored {
  if (s.lives >= MAX_LIVES || s.nextRegenAt === null) {
    return { lives: s.lives, nextRegenAt: null };
  }
  let lives: number = s.lives;
  let nextRegenAt: number | null = s.nextRegenAt;
  while (lives < MAX_LIVES && nextRegenAt !== null && now >= nextRegenAt) {
    lives += 1;
    nextRegenAt = lives < MAX_LIVES ? nextRegenAt + REGEN_MS : null;
  }
  return { lives, nextRegenAt };
}

export type UseLivesReturn = {
  lives: number;
  maxLives: number;
  msToNextRegen: number;
  isOutOfLives: boolean;
  loseLife: () => void;
  /** True once we've read from localStorage; before that we render with FULL. */
  hydrated: boolean;
};

export function useLives(): UseLivesReturn {
  // SSR / pre-hydration: assume full lives so the UI doesn't flash empty.
  const [state, setState] = useState<Stored>(FULL);
  const [hydrated, setHydrated] = useState(false);
  // Wall-clock time, updated once per second by the ticker effect. We keep
  // it in state (not Date.now() during render) so the countdown is pure.
  const [now, setNow] = useState(0);

  // Hydrate from storage + apply any regen that should have happened while away.
  useEffect(() => {
    const stored = load();
    const start = Date.now();
    const fresh = applyRegen(stored, start);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(fresh);
    setNow(start);
    setHydrated(true);
    if (fresh.lives !== stored.lives || fresh.nextRegenAt !== stored.nextRegenAt) {
      save(fresh);
    }
  }, []);

  // 1 Hz ticker: refresh `now` and apply any pending regenerations.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((prev) => {
        const next = applyRegen(prev, t);
        if (next.lives === prev.lives && next.nextRegenAt === prev.nextRegenAt) {
          return prev;
        }
        save(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const loseLife = useCallback(() => {
    setState((prev) => {
      if (prev.lives <= 0) return prev;
      const lives = prev.lives - 1;
      // Start the regen timer if we were at full; otherwise keep the
      // existing one (losing a life mid-regen does NOT reset the clock).
      const nextRegenAt = prev.nextRegenAt ?? Date.now() + REGEN_MS;
      const next: Stored = { lives, nextRegenAt };
      save(next);
      return next;
    });
  }, []);

  // `now === 0` means we haven't hydrated yet — return 0 instead of a wild
  // delta against the wall clock.
  const msToNextRegen =
    state.nextRegenAt !== null && now > 0
      ? Math.max(0, state.nextRegenAt - now)
      : 0;

  return {
    lives: state.lives,
    maxLives: MAX_LIVES,
    msToNextRegen,
    isOutOfLives: state.lives === 0,
    loseLife,
    hydrated,
  };
}

/** "12:34" / "0:07" — never negative, always rounded up to the nearest second. */
export function formatRegenCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
