'use client';

/**
 * Game stats hook for the Walking module.
 *
 *   • bestTimes — fastest completion (ms) per level, persisted forever
 *   • streak    — current consecutive-correct count, resets on first wrong
 *
 * Both metrics are stored in localStorage and survive across sessions.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'kinora.walking.stats';

type Stats = {
  bestTimes: Record<number, number>; // level → ms
  streak: number;
};

const DEFAULT: Stats = { bestTimes: {}, streak: 0 };

function load(): Stats {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return {
      bestTimes:
        parsed.bestTimes && typeof parsed.bestTimes === 'object'
          ? parsed.bestTimes
          : {},
      streak:
        typeof parsed.streak === 'number' && parsed.streak >= 0
          ? Math.floor(parsed.streak)
          : 0,
    };
  } catch {
    return DEFAULT;
  }
}

function save(s: Stats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export type UseGameStatsReturn = {
  bestTimes: Record<number, number>;
  streak: number;
  hydrated: boolean;
  /** Record a successful round; returns true if it's a new personal best. */
  recordSuccess: (level: number, elapsedMs: number) => boolean;
  /** Record a failed verification — resets the streak to 0. */
  recordFailure: () => void;
};

export function useGameStats(): UseGameStatsReturn {
  const [stats, setStats] = useState<Stats>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(load());
    setHydrated(true);
  }, []);

  const recordSuccess = useCallback(
    (level: number, elapsedMs: number): boolean => {
      let isNewBest = false;
      setStats((prev) => {
        const prevBest = prev.bestTimes[level];
        isNewBest = prevBest === undefined || elapsedMs < prevBest;
        const next: Stats = {
          bestTimes: isNewBest
            ? { ...prev.bestTimes, [level]: elapsedMs }
            : prev.bestTimes,
          streak: prev.streak + 1,
        };
        save(next);
        return next;
      });
      return isNewBest;
    },
    [],
  );

  const recordFailure = useCallback(() => {
    setStats((prev) => {
      if (prev.streak === 0) return prev;
      const next: Stats = { ...prev, streak: 0 };
      save(next);
      return next;
    });
  }, []);

  return {
    bestTimes: stats.bestTimes,
    streak: stats.streak,
    hydrated,
    recordSuccess,
    recordFailure,
  };
}

/**
 * Format elapsed milliseconds for display:
 *   < 1 min  → "23.4"     (one decimal — feels precise, motivating)
 *   ≥ 1 min  → "1:23"     (M:SS)
 */
export function formatElapsed(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSec = safe / 1000;
  const m = Math.floor(totalSec / 60);
  if (m === 0) {
    return totalSec.toFixed(1);
  }
  const s = Math.floor(totalSec - m * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
