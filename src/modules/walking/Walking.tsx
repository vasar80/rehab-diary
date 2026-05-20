'use client';

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  Reorder,
  motion,
  AnimatePresence,
  useAnimationControls,
} from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { CANONICAL_ORDER, type FrameId } from './poses';
import { FRAMES_IMAGE } from './frames.config';
import {
  pickLevelFrames,
  shuffleLevelFrames,
  isLevelCorrect,
  MAX_LEVEL,
} from './levels';
import { useLives, formatRegenCountdown } from './useLives';
import { useWalkingProgress } from './useWalkingProgress';
import { useGameStats, formatElapsed } from './useGameStats';
import {
  playShuffleSequence,
  playErrorSound,
  playSuccessSound,
} from './sounds';
import {
  ArrowRightIcon,
  FlameIcon,
  HeartIcon,
  StarIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils/cn';

const CARD_GAP = 10;
const DEAL_STAGGER_MS = 90;
const TIMER_START_BUFFER_MS = 200;
const CARD_ASPECT = 306 / 496;
const ERROR_TOAST_MS = 2600;

type Phase = 'playing' | 'success';

/* ============================================================
   Walking — top-level phase machine
   ============================================================ */

export function Walking() {
  const locale = useLocale();

  // Detect portrait orientation. In portrait il drag delle carte non
  // funziona (framer-motion calcola in coord-screen → un container con
  // rotate-90 CSS fa sì che l'asse X di drag finisca sull'asse Y dello
  // schermo, fuori dalle constraints). Soluzione netta: bloccare il
  // gioco in portrait e chiedere all'utente di ruotare. Il gioco è
  // pensato per landscape (cards in fila orizzontale, 7+ per livello).
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(orientation: portrait)');
    const onChange = () => setIsPortrait(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    } else {
      (mq as unknown as { addListener: (l: () => void) => void }).addListener(onChange);
    }
    return () => {
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', onChange);
      } else {
        (
          mq as unknown as { removeListener: (l: () => void) => void }
        ).removeListener(onChange);
      }
    };
  }, []);

  const {
    level,
    hydrated: progressHydrated,
    advanceLevel,
  } = useWalkingProgress();

  const { lives, maxLives, msToNextRegen, isOutOfLives, loseLife } = useLives();
  const { bestTimes, streak, recordSuccess, recordFailure } = useGameStats();

  // Game starts immediately on entry — no splash/intro page. The round
  // effect kicks off the deal+shuffle as soon as progress is hydrated.
  const [phase, setPhase] = useState<Phase>('playing');
  const [round, setRound] = useState(1);
  const [canonical, setCanonical] = useState<readonly FrameId[]>(() =>
    CANONICAL_ORDER.slice(0, 3),
  );
  const [order, setOrder] = useState<FrameId[]>(() => [
    ...CANONICAL_ORDER.slice(0, 3),
  ]);
  const [errorState, setErrorState] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [livesNonce, setLivesNonce] = useState(0);
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [lastResult, setLastResult] = useState<{
    timeMs: number;
    isNewBest: boolean;
    previousBestMs: number | null;
  } | null>(null);

  const dealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Try landscape orientation lock (PWA / fullscreen only). */
  useEffect(() => {
    try {
      (
        screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        }
      ).lock?.('landscape').catch(() => {});
    } catch {
      /* not supported */
    }
    return () => {
      try {
        screen.orientation.unlock();
      } catch {
        /* ignore */
      }
    };
  }, []);

  /* Fullscreen on first user gesture inside the module — hides the browser
     chrome on Chrome / Firefox mobile. iOS Safari rejects this silently, so
     iPhone users still need the "Add to Home Screen" path for true fullscreen.
     We listen once on the document so any first tap (back button, Mescola,
     dragging a card) is the trigger; the browser requires a real gesture. */
  useEffect(() => {
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      try {
        const el = document.documentElement as HTMLElement & {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
        };
        const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
        req?.call(el).catch(() => {});
      } catch {
        /* not supported / denied */
      }
      document.removeEventListener('pointerdown', trigger);
    };
    document.addEventListener('pointerdown', trigger);
    return () => document.removeEventListener('pointerdown', trigger);
  }, []);

  /* Cleanup on unmount. */
  useEffect(() => {
    return () => {
      if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  /* New round: regenerate canonical, shuffle, deal sound, kick off timer. */
  useEffect(() => {
    if (round === 0) return;
    if (!progressHydrated) return;
    const c = pickLevelFrames(level);
    /* eslint-disable react-hooks/set-state-in-effect */
    setCanonical(c);
    setOrder(shuffleLevelFrames(c));
    setErrorState(false);
    setErrorToastVisible(false);
    setStartedAt(null);
    setLiveElapsed(0);
    /* eslint-enable react-hooks/set-state-in-effect */

    playShuffleSequence(c.length, DEAL_STAGGER_MS);

    const startDelay = c.length * DEAL_STAGGER_MS + TIMER_START_BUFFER_MS;
    if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
    dealTimerRef.current = setTimeout(() => {
      setStartedAt(Date.now());
    }, startDelay);

    return () => {
      if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
    };
  }, [round, progressHydrated, level]);

  /* Live timer ticker (100 ms while playing). */
  useEffect(() => {
    if (phase !== 'playing' || startedAt === null) return;
    const id = setInterval(() => {
      setLiveElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  /* Auto-dismiss the error toast. */
  useEffect(() => {
    if (!errorToastVisible) return;
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(
      () => setErrorToastVisible(false),
      ERROR_TOAST_MS,
    );
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [errorToastVisible]);

  const isCorrect = useMemo(
    () => isLevelCorrect(canonical, order),
    [canonical, order],
  );
  const correctCount = useMemo(
    () => order.reduce((acc, id, i) => (id === canonical[i] ? acc + 1 : acc), 0),
    [order, canonical],
  );
  const cardCount = order.length;

  const handleVerify = useCallback(() => {
    if (isOutOfLives) return;
    if (startedAt === null) return;
    if (isCorrect) {
      const timeMs = Date.now() - startedAt;
      const previousBestMs = bestTimes[level] ?? null;
      const isNewBest = recordSuccess(level, timeMs);
      setLastResult({ timeMs, isNewBest, previousBestMs });
      setStartedAt(null);
      setPhase('success');
      playSuccessSound();
    } else {
      setErrorState(true);
      loseLife();
      recordFailure();
      setShakeNonce((n) => n + 1);
      setLivesNonce((n) => n + 1);
      setErrorToastVisible(true);
      playErrorSound();
    }
  }, [
    isCorrect,
    isOutOfLives,
    startedAt,
    bestTimes,
    level,
    recordSuccess,
    recordFailure,
    loseLife,
  ]);

  const handleShuffle = useCallback(() => {
    if (isOutOfLives) return;
    setRound((r) => r + 1);
  }, [isOutOfLives]);

  const handleSuccessContinue = useCallback(() => {
    if (level < MAX_LEVEL) advanceLevel();
    setLastResult(null);
    setPhase('playing');
    setRound((r) => r + 1);
  }, [level, advanceLevel]);

  const handleClearError = useCallback(() => {
    if (errorState) {
      setErrorState(false);
      setErrorToastVisible(false);
    }
  }, [errorState]);

  if (isPortrait) {
    return <RotateDeviceOverlay backHref={`/${locale}`} />;
  }

  return (
    <div
      className={cn(
        'bg-bone flex flex-col overflow-hidden select-none',
        'fixed inset-0',
      )}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <GameView
        level={level}
        order={order}
        canonical={canonical}
        cardCount={cardCount}
        errorState={errorState}
        shakeNonce={shakeNonce}
        phaseSuccess={phase === 'success'}
        lives={lives}
        maxLives={maxLives}
        msToNextRegen={msToNextRegen}
        livesNonce={livesNonce}
        isOutOfLives={isOutOfLives}
        liveElapsed={liveElapsed}
        isTimerRunning={startedAt !== null && phase === 'playing'}
        backHref={`/${locale}`}
        onReorder={(next) => {
          setOrder(next);
          if (errorState) handleClearError();
        }}
        onShuffle={handleShuffle}
        onVerify={handleVerify}
      />

      <AnimatePresence>
        {errorToastVisible && (
          <ErrorToast correctCount={correctCount} total={cardCount} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'success' && lastResult && (
          <SuccessOverlay
            level={level}
            timeMs={lastResult.timeMs}
            isNewBest={lastResult.isNewBest}
            previousBestMs={lastResult.previousBestMs}
            streak={streak}
            onContinue={handleSuccessContinue}
            backHref={`/${locale}`}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOutOfLives && phase !== 'success' && (
          <OutOfLivesOverlay
            msToNextRegen={msToNextRegen}
            backHref={`/${locale}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   GameView — header · cards row · footer
   ============================================================ */

function GameView({
  level,
  order,
  canonical,
  cardCount,
  errorState,
  shakeNonce,
  phaseSuccess,
  lives,
  maxLives,
  msToNextRegen,
  livesNonce,
  isOutOfLives,
  liveElapsed,
  isTimerRunning,
  backHref,
  onReorder,
  onShuffle,
  onVerify,
}: {
  level: number;
  order: FrameId[];
  canonical: readonly FrameId[];
  cardCount: number;
  errorState: boolean;
  shakeNonce: number;
  phaseSuccess: boolean;
  lives: number;
  maxLives: number;
  msToNextRegen: number;
  livesNonce: number;
  isOutOfLives: boolean;
  liveElapsed: number;
  isTimerRunning: boolean;
  backHref: string;
  onReorder: (next: FrameId[]) => void;
  onShuffle: () => void;
  onVerify: () => void;
}) {
  const t = useTranslations('Walking');
  const tCommon = useTranslations('Common');

  /* JS-measured sizing — keeps cards alive in Safari's framer drag layer. */
  const cardsAreaRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 });

  /* Orientation-change shield.
   *
   * Rotating the device fires a cascade of resize events over ~300-450ms
   * (orientation transition animation + address bar settling +
   * `100dvh`/`100dvw` re-computing). Without protection, ResizeObserver
   * re-sizes the cards every frame and `Reorder.Group` recomputes
   * positions on top of that — they appear to "go crazy" and dragging
   * breaks. The fix: listen to `(orientation: portrait)` matchMedia, set
   * `isReorienting` for ~480ms, fade the Reorder.Group during that
   * window. Final dimensions are picked up by the debounced ResizeObserver
   * below. */
  const [isReorienting, setIsReorienting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(orientation: portrait)');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      setIsReorienting(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIsReorienting(false), 480);
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    } else {
      // Safari < 14 fallback
      (mq as unknown as { addListener: (l: () => void) => void }).addListener(
        onChange,
      );
    }
    return () => {
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', onChange);
      } else {
        (
          mq as unknown as { removeListener: (l: () => void) => void }
        ).removeListener(onChange);
      }
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!cardsAreaRef.current) return;
    const el = cardsAreaRef.current;

    /** Debounce cardSize updates by 200ms. Address-bar appear/disappear,
     *  mid-rotation intermediate frames, and any rapid resize stream get
     *  coalesced into a single update at the trailing edge — so cards
     *  never animate between stale intermediate sizes. */
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const compute = (cw: number, ch: number) => {
      if (cw <= 0 || ch <= 0) return;
      let h = ch;
      let w = h * CARD_ASPECT;
      const maxW = (cw - (cardCount - 1) * CARD_GAP) / cardCount;
      if (w > maxW) {
        w = Math.max(0, maxW);
        h = w / CARD_ASPECT;
      }
      setCardSize({ w: Math.floor(w), h: Math.floor(h) });
    };

    const scheduleCompute = (cw: number, ch: number) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => compute(cw, ch), 200);
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleCompute(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(el);
    // IMPORTANT: use clientWidth/clientHeight (layout dimensions) and not
    // getBoundingClientRect (visual dimensions, swapped by the 90° rotation
    // hack on portrait). Otherwise the first measurement is rotated and
    // cards render too small/skinny for a frame before ResizeObserver fixes
    // it. We also re-measure on the next frame to handle any post-mount
    // layout shift. Initial measurements bypass the debounce — they are
    // the only chance to render at all.
    compute(el.clientWidth, el.clientHeight);
    const raf = requestAnimationFrame(() => {
      if (cardsAreaRef.current) {
        compute(cardsAreaRef.current.clientWidth, cardsAreaRef.current.clientHeight);
      }
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [cardCount]);

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="absolute inset-0 flex flex-col"
    >
      {/* ─── Header ───────────────────────────── */}
      <header
        className="flex-shrink-0 bg-bone z-20"
        style={{ borderBottom: '1px solid var(--ink-line)' }}
      >
        <div
          className="flex items-center justify-between h-11 gap-3"
          style={{
            paddingLeft: 'max(14px, env(safe-area-inset-left))',
            paddingRight: 'max(14px, env(safe-area-inset-right))',
          }}
        >
          <Link
            href={backHref}
            aria-label={tCommon('back')}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-[10px] text-ink active:scale-[0.96]"
            style={{
              border: '1px solid var(--ink-line)',
              transition: `transform var(--dur-quick) var(--ease-snap)`,
            }}
          >
            <ArrowRightIcon size={14} className="rotate-180" />
          </Link>

          <div className="flex items-baseline gap-3 min-w-0">
            <span
              className="font-mono text-[10.5px] font-semibold tracking-[0.18em] uppercase text-ink-mute px-1.5 py-0.5 rounded-[6px]"
              style={{ background: 'var(--color-bone-2)' }}
            >
              L{level}
            </span>
            <Timer ms={liveElapsed} running={isTimerRunning} />
          </div>

          <LivesBar
            lives={lives}
            maxLives={maxLives}
            msToNextRegen={msToNextRegen}
            livesNonce={livesNonce}
          />
        </div>
      </header>

      {/* ─── Cards row ────────────────────────── */}
      <main
        ref={cardsAreaRef}
        className="flex-1 min-h-0 flex items-center justify-center"
        style={{
          paddingLeft: 'max(14px, env(safe-area-inset-left))',
          paddingRight: 'max(14px, env(safe-area-inset-right))',
          paddingTop: '14px',
          paddingBottom: '14px',
        }}
      >
        {cardSize.w > 0 && (
          <Reorder.Group
            axis="x"
            values={order}
            onReorder={onReorder}
            className="flex flex-row items-center justify-center"
            style={{
              gap: `${CARD_GAP}px`,
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              // Hide + block input during the 480ms orientation-change
              // window so the user never sees the layout settle visually
              // and can't trigger a drag mid-rotation.
              opacity: isReorienting ? 0 : 1,
              pointerEvents: isReorienting ? 'none' : 'auto',
              transition: 'opacity 200ms ease-out',
            }}
          >
            {order.map((id, idx) => (
              <FrameCard
                key={id}
                id={id}
                position={idx + 1}
                total={cardCount}
                width={cardSize.w}
                height={cardSize.h}
                isInCorrectSpot={id === canonical[idx]}
                isError={errorState}
                isSuccess={phaseSuccess}
                shakeNonce={shakeNonce}
              />
            ))}
          </Reorder.Group>
        )}
      </main>

      {/* ─── Footer ───────────────────────────── */}
      <footer
        className="flex-shrink-0 bg-bone z-20"
        style={{ borderTop: '1px solid var(--ink-line)' }}
      >
        <div
          className="flex gap-2.5 py-2.5"
          style={{
            paddingLeft: 'max(14px, env(safe-area-inset-left))',
            paddingRight: 'max(14px, env(safe-area-inset-right))',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={onShuffle}
            disabled={isOutOfLives}
            className="flex-1 h-11 rounded-[12px] font-sans font-semibold text-[14px] text-ink active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: 'transparent',
              border: '1px solid var(--ink-line-strong)',
              transition: `transform var(--dur-quick) var(--ease-snap)`,
            }}
          >
            {t('shuffle')}
          </button>
          <button
            type="button"
            onClick={onVerify}
            disabled={isOutOfLives || !isTimerRunning}
            className="flex-[1.5] h-11 rounded-[12px] text-paper font-sans font-semibold text-[14px] tracking-[0.01em] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: 'var(--color-accent)',
              transition: `transform var(--dur-quick) var(--ease-snap), background var(--dur-quick) var(--ease-snap)`,
            }}
          >
            {t('verify')}
          </button>
        </div>
      </footer>
    </motion.div>
  );
}

/* ============================================================
   Timer — bold mono, bigger than chrome, slight pulse while running
   ============================================================ */

function Timer({ ms, running }: { ms: number; running: boolean }) {
  return (
    <motion.span
      animate={
        running
          ? { scale: [1, 1.012, 1] }
          : { scale: 1 }
      }
      transition={
        running
          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0 }
      }
      className={cn(
        'font-mono text-[22px] font-bold tabular-nums tracking-[-0.025em] origin-left',
        running ? 'text-ink' : 'text-ink-mute',
      )}
    >
      {formatElapsed(ms)}
    </motion.span>
  );
}

/* ============================================================
   FrameCard — photographic frame, minimal chrome
   ============================================================ */

function FrameCard({
  id,
  position,
  total,
  width,
  height,
  isInCorrectSpot,
  isError,
  isSuccess,
  shakeNonce,
}: {
  id: FrameId;
  position: number;
  total: number;
  width: number;
  height: number;
  isInCorrectSpot: boolean;
  isError: boolean;
  isSuccess: boolean;
  shakeNonce: number;
}) {
  const t = useTranslations('Walking');
  const canonicalIndex = CANONICAL_ORDER.indexOf(id);
  const bgPositionX = (canonicalIndex / (CANONICAL_ORDER.length - 1)) * 100;
  const bgSizeX = CANONICAL_ORDER.length * 100;

  const showWrong = isError && !isInCorrectSpot;
  const showRight = isError && isInCorrectSpot;

  const shakeControls = useAnimationControls();
  const lastShake = useRef(0);
  useEffect(() => {
    if (shakeNonce === 0 || shakeNonce === lastShake.current) return;
    lastShake.current = shakeNonce;
    if (showWrong) {
      shakeControls.start({
        x: [0, -4, 4, -3, 3, 0],
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      });
    }
  }, [shakeNonce, showWrong, shakeControls]);

  /* Ring color (1.5 px solid in role color, no offset). Successful round
     uses the warm-amber ring; correct-spot in error state uses sage; wrong
     uses alert. Otherwise hairline. */
  const ringColor = isSuccess
    ? 'var(--color-warm)'
    : showRight
    ? 'var(--color-grow)'
    : showWrong
    ? 'var(--color-alert)'
    : 'var(--ink-line)';
  const ringWidth = isSuccess || showRight || showWrong ? '1.5px' : '1px';

  return (
    <Reorder.Item
      value={id}
      // axis="x" on Reorder.Group controls only the reorder algorithm, not
      // the physical drag. We belt-and-suspenders the lock:
      //   1) dragConstraints={top:0, bottom:0} caps the y motion value
      //   2) transformTemplate strips translateY(...) from the rendered
      //      transform string while preserving every other transform that
      //      framer-motion injects (translateX, scale, rotate, etc.) so
      //      drag X keeps working unchanged.
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0}
      dragMomentum={false}
      transformTemplate={(_values, generated) => {
        if (!generated) return '';
        return generated.replace(/\btranslateY\([^)]*\)\s*/gi, '').trim();
      }}
      whileDrag={{
        scale: 1.025,
        boxShadow:
          '0 1px 0 oklch(0.18 0.015 60 / 0.06), 0 18px 36px -10px oklch(0.18 0.015 60 / 0.22)',
        zIndex: 30,
        cursor: 'grabbing',
      }}
      transition={{ type: 'spring', stiffness: 600, damping: 40 }}
      className="relative overflow-hidden cursor-grab"
      style={
        {
          width: `${width}px`,
          height: `${height}px`,
          flex: '0 0 auto',
          background: 'var(--color-paper)',
          border: `${ringWidth} solid ${ringColor}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-1)',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserDrag: 'none',
          transition: 'border-color var(--dur-base) var(--ease-out)',
        } as React.CSSProperties
      }
      aria-label={t('frameLabel', { position, total })}
    >
      <motion.div animate={shakeControls} className="absolute inset-0">
        {/* The photographic slice — the hero */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: FRAMES_IMAGE.fallbackBg,
            backgroundImage: `url('${FRAMES_IMAGE.src}')`,
            backgroundSize: `${bgSizeX}% 100%`,
            backgroundPosition: `${bgPositionX}% center`,
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Position label — mono, bottom-left, no badge box */}
        <div
          className="absolute bottom-2 left-2.5 pointer-events-none px-1.5 py-0.5 rounded-[6px]"
          style={{
            background: 'oklch(0.99 0.005 80 / 0.92)',
            boxShadow: '0 0 0 1px oklch(0.18 0.015 60 / 0.10)',
          }}
        >
          <span
            className="font-mono text-[11px] font-semibold tabular-nums tracking-tight"
            style={{ color: 'var(--color-ink)' }}
          >
            {position}
          </span>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

/* ============================================================
   LivesBar — five hearts (vivid coral), wobble + "−1" floater on lose
   ============================================================ */

const HEART_RED_FILLED = 'oklch(0.62 0.20 25)';
const HEART_EMPTY = 'oklch(0.85 0.020 60)';

function LivesBar({
  lives,
  maxLives,
  msToNextRegen,
  livesNonce,
}: {
  lives: number;
  maxLives: number;
  msToNextRegen: number;
  livesNonce: number;
}) {
  const controls = useAnimationControls();
  const lastSeen = useRef(0);
  const [lostFlash, setLostFlash] = useState(false);
  const lostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (livesNonce === 0 || livesNonce === lastSeen.current) return;
    lastSeen.current = livesNonce;

    // Pulse the whole bar.
    controls.start({
      scale: [1, 1.14, 0.96, 1.05, 1],
      transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
    });

    // Show the "−1" floater for ~700 ms.
    setLostFlash(true);
    if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
    lostTimerRef.current = setTimeout(() => setLostFlash(false), 700);
  }, [livesNonce, controls]);

  useEffect(() => () => {
    if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
  }, []);

  return (
    <motion.div
      animate={controls}
      className="relative flex items-center gap-1.5 flex-shrink-0 origin-center"
    >
      <div className="flex items-center gap-[3px]">
        {Array.from({ length: maxLives }).map((_, i) => {
          const filled = i < lives;
          // The just-lost heart (the leftmost empty) gets a one-shot pop.
          const isJustLost = !filled && i === lives && lostFlash;
          return (
            <motion.span
              key={i}
              animate={
                isJustLost
                  ? { scale: [1.25, 0.85, 1] }
                  : { scale: 1 }
              }
              transition={
                isJustLost
                  ? { duration: 0.42, ease: [0.16, 1, 0.3, 1] }
                  : { duration: 0 }
              }
              className="inline-flex"
              style={{
                color: filled ? HEART_RED_FILLED : HEART_EMPTY,
                filter: filled
                  ? 'drop-shadow(0 1px 0 oklch(0.45 0.14 25 / 0.4))'
                  : 'none',
                transition: 'color var(--dur-base) var(--ease-out)',
              }}
            >
              <HeartIcon size={16} filled={filled} />
            </motion.span>
          );
        })}
      </div>

      {lives < maxLives && (
        <span className="font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.04em] text-ink-mute">
          {formatRegenCountdown(msToNextRegen)}
        </span>
      )}

      {/* Floating "−1" that rises and fades on each life loss. */}
      <AnimatePresence>
        {lostFlash && (
          <motion.span
            key={`lost-${livesNonce}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -18 }}
            exit={{ opacity: 0, y: -22 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -top-2 right-0 font-mono text-[12px] font-bold pointer-events-none select-none"
            style={{ color: HEART_RED_FILLED }}
          >
            −1
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================================================
   ErrorToast — soft alert tint, hairline, mono prefix
   ============================================================ */

function ErrorToast({
  correctCount,
  total,
}: {
  correctCount: number;
  total: number;
}) {
  const t = useTranslations('Walking');
  return (
    <motion.div
      key="err-toast"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -16, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <div
        className="flex items-center gap-2.5 rounded-[12px] px-3 py-2 max-w-[88vw]"
        style={{
          background: 'oklch(0.95 0.04 25)',
          border: '1px solid var(--color-alert)',
        }}
      >
        <span
          className="font-mono text-[10.5px] font-bold tracking-[0.16em] uppercase text-paper px-1.5 py-0.5 rounded-[6px] flex-shrink-0"
          style={{ background: 'var(--color-alert)' }}
        >
          −1
        </span>
        <p className="font-sans font-medium text-[13.5px] leading-tight text-ink whitespace-nowrap">
          {correctCount > 0
            ? t('errorPartial', { count: correctCount, total })
            : t('errorNothing')}
        </p>
      </div>
    </motion.div>
  );
}

type Particle = {
  id: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
  rotate: number;
  duration: number;
  delay: number;
  radius: string;
};

/** Random burst layout. Called once per Confetti mount via useState init. */
function generateParticles(): Particle[] {
  const colors = [
    'var(--color-accent)',
    'var(--color-warm)',
    'var(--color-grow)',
    'var(--color-accent-strong)',
    'var(--color-warm)',
  ];
  return Array.from({ length: 26 }, (_, i) => {
    const baseAngle = (i / 26) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.5;
    const angle = baseAngle + jitter;
    const distance = 140 + Math.random() * 140;
    return {
      id: i,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance,
      size: 5 + Math.random() * 8,
      color: colors[i % colors.length],
      rotate: (Math.random() - 0.5) * 720,
      duration: 0.85 + Math.random() * 0.5,
      delay: Math.random() * 0.08,
      radius: i % 2 === 0 ? '2px' : '999px',
    };
  });
}

/* ============================================================
   Confetti — celebratory particle burst around the success modal
   ============================================================ */

function Confetti() {
  // Generate a stable burst pattern for this mount. useState's lazy
  // initializer is called once, which is the right home for the random
  // seed — and it satisfies the react-hooks/purity rule.
  const [particles] = useState(() => generateParticles());

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-visible pointer-events-none"
    >
      {/* Expanding ring blast — the "thump" of the celebration */}
      <motion.div
        className="absolute top-1/2 left-1/2 rounded-full"
        style={{
          width: 32,
          height: 32,
          marginLeft: -16,
          marginTop: -16,
          border: '3px solid var(--color-warm)',
        }}
        initial={{ scale: 0, opacity: 0.7 }}
        animate={{ scale: 12, opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Particles bursting outward */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-1/2 left-1/2"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.radius,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            willChange: 'transform, opacity',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            x: p.endX,
            y: p.endY,
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.4],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            times: [0, 0.12, 0.7, 1],
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   StarRow — 1 to 3 gold stars, popping in sequence
   ============================================================ */

const STAR_GOLD = 'oklch(0.80 0.16 78)';
const STAR_GOLD_DEEP = 'oklch(0.62 0.16 65)';
const STAR_EMPTY = 'oklch(0.86 0.012 70)';

/**
 * Award:
 *   3 stars — beat or matched the previous best (or first-ever attempt)
 *   2 stars — within 50% of the previous best
 *   1 star  — slower than 1.5× the previous best
 */
function calculateStars(timeMs: number, previousBestMs: number | null): 1 | 2 | 3 {
  if (previousBestMs === null) return 3;
  if (timeMs <= previousBestMs) return 3;
  if (timeMs <= previousBestMs * 1.5) return 2;
  return 1;
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {[0, 1, 2].map((i) => {
        const filled = i < count;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -50, opacity: 0 }}
            animate={{
              scale: filled ? 1 : 0.7,
              rotate: 0,
              opacity: filled ? 1 : 0.28,
            }}
            transition={{
              delay: 0.25 + i * 0.18,
              type: 'spring',
              stiffness: 360,
              damping: 16,
            }}
            style={{
              color: filled ? STAR_GOLD : STAR_EMPTY,
              filter: filled
                ? `drop-shadow(0 2px 0 ${STAR_GOLD_DEEP}) drop-shadow(0 6px 12px oklch(0.62 0.16 65 / 0.35))`
                : 'none',
            }}
          >
            <StarIcon size={48} filled={filled} />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SuccessOverlay — paper sheet, stars, timer, fireworks
   ============================================================ */

function SuccessOverlay({
  level,
  timeMs,
  isNewBest,
  previousBestMs,
  streak,
  onContinue,
  backHref,
}: {
  level: number;
  timeMs: number;
  isNewBest: boolean;
  previousBestMs: number | null;
  streak: number;
  onContinue: () => void;
  backHref: string;
}) {
  const t = useTranslations('Walking');
  const tCommon = useTranslations('Common');
  const isMaxLevel = level >= MAX_LEVEL;
  const stars = calculateStars(timeMs, previousBestMs);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: 'oklch(0.18 0.015 60 / 0.32)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-[24px] p-6 overflow-visible"
        style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--ink-line)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        {/* Fireworks — bursts from the centre of the modal */}
        <Confetti />

        {/* Stars — the headline of the win */}
        <StarRow count={stars} />

        {/* Eyebrow row */}
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <p className="eyebrow" style={{ color: STAR_GOLD_DEEP }}>
            {t('successTitle')}
          </p>
        </div>

        {/* Time hero — centered under the stars */}
        <div className="flex items-end justify-center gap-2 flex-wrap">
          <p
            className="font-mono font-bold tabular-nums tracking-[-0.025em] leading-none text-ink"
            style={{ fontSize: 'clamp(38px, 8.4vh, 52px)' }}
          >
            {formatElapsed(timeMs)}
          </p>
          {isNewBest && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              transition={{ delay: 0.85, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="font-sans font-bold text-[11px] tracking-[0.18em] uppercase px-2 py-1 rounded-[6px] mb-1.5"
              style={{
                background: STAR_GOLD,
                color: 'var(--color-ink)',
                boxShadow: `0 2px 0 ${STAR_GOLD_DEEP}`,
              }}
            >
              {t('newBest')}
            </motion.span>
          )}
        </div>

        {previousBestMs !== null && !isNewBest ? (
          <p className="mt-1 text-center font-mono text-[11.5px] tabular-nums tracking-[0.04em] text-ink-mute">
            {t('previousBest', { time: formatElapsed(previousBestMs) })}
          </p>
        ) : (
          <p className="mt-2 text-center font-sans text-[14px] text-ink-2 leading-snug">
            {isMaxLevel
              ? t('successMaxLevel')
              : t('successUnlocked', { next: level + 1 })}
          </p>
        )}

        {/* Stat row: XP + streak, centered */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <span
            className="font-mono text-[10.5px] font-semibold tracking-[0.04em] px-2 py-0.5 rounded-[6px]"
            style={{
              background: 'var(--color-grow-soft)',
              color: 'var(--color-grow)',
              border: '1px solid var(--ink-line)',
            }}
          >
            +10 XP
          </span>
          {streak >= 2 && (
            <span
              className="flex items-center gap-1 font-mono text-[10.5px] font-semibold tracking-[0.04em] px-2 py-0.5 rounded-[6px] tabular-nums"
              style={{
                background: 'var(--color-warm-soft)',
                color: 'var(--color-ink)',
                border: '1px solid var(--ink-line)',
              }}
            >
              <FlameIcon size={11} className="text-accent" />
              <span>{streak}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2.5">
          <Link
            href={backHref}
            className="flex-1 h-11 rounded-[12px] flex items-center justify-center font-sans font-semibold text-[14px] text-ink active:scale-[0.98]"
            style={{
              border: '1px solid var(--ink-line-strong)',
              transition: `transform var(--dur-quick) var(--ease-snap)`,
            }}
          >
            {tCommon('close')}
          </Link>
          <button
            type="button"
            onClick={onContinue}
            className="flex-[1.4] h-11 rounded-[12px] flex items-center justify-center text-paper font-sans font-semibold text-[14px] tracking-[0.01em] active:scale-[0.98]"
            style={{
              background: 'var(--color-accent)',
              transition: `transform var(--dur-quick) var(--ease-snap)`,
            }}
          >
            {tCommon('continue')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   OutOfLivesOverlay — paper sheet, mono countdown hero
   ============================================================ */

function OutOfLivesOverlay({
  msToNextRegen,
  backHref,
}: {
  msToNextRegen: number;
  backHref: string;
}) {
  const t = useTranslations('Walking');
  const tCommon = useTranslations('Common');

  return (
    <motion.div
      key="oolives"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="absolute inset-0 z-40 flex items-center justify-center px-6"
      style={{
        background: 'oklch(0.18 0.015 60 / 0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="w-full max-w-sm rounded-[24px] p-6 text-center"
        style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--ink-line)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <p className="eyebrow text-accent">{t('outOfLivesTitle')}</p>
        <p className="mt-3 font-sans text-[14px] text-ink-2 leading-snug">
          {t('outOfLivesBody')}
        </p>
        <p
          className="mt-4 font-mono font-semibold tabular-nums tracking-[-0.02em] leading-none text-ink"
          style={{ fontSize: 'clamp(40px, 9vh, 56px)' }}
        >
          {formatRegenCountdown(msToNextRegen)}
        </p>
        <Link
          href={backHref}
          className="mt-6 inline-flex items-center justify-center w-full h-11 rounded-[12px] font-sans font-semibold text-[14px] text-ink active:scale-[0.98]"
          style={{
            border: '1px solid var(--ink-line-strong)',
            transition: `transform var(--dur-quick) var(--ease-snap)`,
          }}
        >
          {tCommon('back')}
        </Link>
      </div>
    </motion.div>
  );
}

/* ============================================================
   RotateDeviceOverlay
   ============================================================
   In portrait il drag delle carte non funziona (parent ruotato in CSS
   sfasa il pointer-event mapping di framer-motion). Mostriamo un
   prompt grafico e blocchiamo il gioco fino a quando l'utente non
   ruota il telefono. Stile coerente col core: pink + violet, font
   Playfair/Inter. */
function RotateDeviceOverlay({ backHref }: { backHref: string }) {
  const tCommon = useTranslations('Common');
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
      style={{
        background: '#fbf7f9',
        color: '#14102F',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
      }}
    >
      <motion.div
        animate={{ rotate: [0, 90, 90, 0, 0], opacity: [1, 1, 1, 1, 1] }}
        transition={{
          duration: 2.4,
          times: [0, 0.35, 0.55, 0.85, 1],
          repeat: Infinity,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          width: 96,
          height: 156,
          borderRadius: 22,
          border: '3px solid #322A6E',
          background: 'rgba(232, 90, 122, 0.08)',
          marginBottom: 36,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 4,
            borderRadius: 2,
            background: '#322A6E',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '2px solid #322A6E',
          }}
        />
      </motion.div>
      <h1
        style={{
          fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        <span style={{ color: '#E85A7A' }}>R</span>
        <span style={{ color: '#322A6E' }}>uota il telefono</span>
      </h1>
      <p
        style={{
          marginTop: 12,
          fontSize: 15,
          lineHeight: 1.5,
          color: '#57516e',
          maxWidth: 320,
        }}
      >
        Il riordino delle carte funziona in orizzontale — gira il
        dispositivo per giocare.
      </p>
      <Link
        href={backHref}
        style={{
          marginTop: 28,
          display: 'inline-flex',
          alignItems: 'center',
          height: 44,
          padding: '0 22px',
          borderRadius: 12,
          border: '1px solid rgba(20, 16, 47, 0.20)',
          color: '#322A6E',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        {tCommon('back')}
      </Link>
    </div>
  );
}
