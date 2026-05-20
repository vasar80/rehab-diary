'use client';

/**
 * Walking-module progress hook.
 *
 *   • level — 1..5, advances on every successful "Verifica"
 *   • hasSeenIntro — true once the user has dismissed the first-run popup
 *
 * Persisted to localStorage so progress carries across sessions. SSR-safe:
 * starts with sensible defaults, hydrates on mount.
 */

import { useCallback, useEffect, useState } from 'react';
import { MAX_LEVEL, MIN_LEVEL } from './levels';

const STORAGE_KEY = 'kinora.walking.progress';

type Progress = {
  level: number;
  hasSeenIntro: boolean;
};

const DEFAULT: Progress = { level: MIN_LEVEL, hasSeenIntro: false };

function load(): Progress {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      level: clamp(parsed.level ?? MIN_LEVEL, MIN_LEVEL, MAX_LEVEL),
      hasSeenIntro: !!parsed.hasSeenIntro,
    };
  } catch {
    return DEFAULT;
  }
}

function save(p: Progress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export type UseWalkingProgressReturn = Progress & {
  hydrated: boolean;
  /** Bumped each time we want to force a fresh canonical (e.g. after success at MAX_LEVEL). */
  reshuffleKey: number;
  advanceLevel: () => void;
  resetLevel: () => void;
  markIntroSeen: () => void;
  /** Trigger a regenerate of the current level's frames without changing `level`. */
  bumpReshuffle: () => void;
};

export function useWalkingProgress(): UseWalkingProgressReturn {
  const [progress, setProgress] = useState<Progress>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const [reshuffleKey, setReshuffleKey] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(load());
    setHydrated(true);
  }, []);

  const advanceLevel = useCallback(() => {
    setProgress((prev) => {
      // At MAX_LEVEL we stay put; the parent triggers a reshuffle for variety.
      if (prev.level >= MAX_LEVEL) {
        setReshuffleKey((k) => k + 1);
        return prev;
      }
      const next: Progress = { ...prev, level: prev.level + 1 };
      save(next);
      return next;
    });
  }, []);

  const resetLevel = useCallback(() => {
    setProgress((prev) => {
      const next: Progress = { ...prev, level: MIN_LEVEL };
      save(next);
      return next;
    });
  }, []);

  const markIntroSeen = useCallback(() => {
    setProgress((prev) => {
      if (prev.hasSeenIntro) return prev;
      const next: Progress = { ...prev, hasSeenIntro: true };
      save(next);
      return next;
    });
  }, []);

  const bumpReshuffle = useCallback(() => {
    setReshuffleKey((k) => k + 1);
  }, []);

  return {
    ...progress,
    hydrated,
    reshuffleKey,
    advanceLevel,
    resetLevel,
    markIntroSeen,
    bumpReshuffle,
  };
}
