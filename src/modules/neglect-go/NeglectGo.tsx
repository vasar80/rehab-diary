'use client';

/**
 * Neglect-Go — 360° scanning game for hemispatial neglect rehab.
 *
 * Implementation note (after several painful iterations): the player pans
 * a 360° panorama with a finger swipe. NO device-orientation sensors. The
 * sensor-based AR approach has a fundamental ceiling on Web platforms
 * without WebXR or a paid SLAM SDK, and that ceiling is far below what
 * elderly / neglect patients can tolerate without disorientation.
 *
 * Touch-based panning is rock solid, 1:1, cross-browser, no permissions.
 * The therapeutic value is preserved — the player still has to scan
 * actively across the full 360° (left + right + up + down) to find all
 * ten numbers, so contralateral hemifield exploration is forced.
 *
 * The panorama, marker placement, drag handling, edge wrapping, and
 * touch-vs-mouse abstraction are all delegated to Photo Sphere Viewer
 * (a battle-tested library used by Wikipedia, NASA, museums). We just
 * configure markers, listen for camera position, and run the capture
 * countdown ourselves.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import { ArrowRightIcon } from '@/components/icons';
import { playCaptureSound, playLockTick } from './sounds';

const TOTAL_TARGETS = 10;

/** Capture mechanics: easier to enter the lock zone, sticky once locked. */
const CAPTURE_RADIUS_DEG = 10;
const CAPTURE_HYSTERESIS_DEG = 14;
const CAPTURE_HOLD_MS = 650;

/**
 * Panoramas cycled through on each "Continua" tap after winning a round.
 * Tutti gli URL verificati live: HTTP 200, CORS `*`, JPEG equirettangolare.
 *
 * 🟢 LICENSING — TUTTI CC0 (public domain, uso commerciale libero)
 *
 * Fonte: Polyhaven (polyhaven.com), gold-standard per HDRI/panorama CC0.
 * Nessuna attribuzione richiesta, nessun share-alike — uso commerciale
 * libero per l'app a pagamento.
 *
 * Round 1: Belfast — sunset drammatico urbano (UK, 15MB)
 * Round 2: Dikhololo — notte stellata in Africa (9MB)
 * Round 3: Kiara — savana all'alba (Kenya, 5MB)
 * Round 4: Vatican Road — Roma vista Vaticano (6MB)
 * Round 5: Ulm Münster — cattedrale gotica (Germania, 6MB)
 * Round 6: Venezia al tramonto (Italia, 5MB)
 * Round 7: The Lost City — rovine antiche (4MB)
 * Round 8: Cielo in fiamme — sunset drammatico (3MB)
 *
 * Per aggiungere round, APPEND solo all'array — NON modificare la logica
 * di gioco. Le etichette dei marker si auto-calibrano via `roundIndex *
 * TOTAL_TARGETS` in `buildMarkers`.
 */
const PANORAMA_URLS = [
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/belfast_sunset_puresky.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/dikhololo_night.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/kiara_1_dawn.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/vatican_road.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/ulmer_muenster.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/venice_sunset.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/the_lost_city.jpg',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/the_sky_is_on_fire.jpg',
];

/**
 * Angular positions for the 10 numbers around the player. Yaw and pitch
 * in degrees.
 *
 * CLINICAL DESIGN: 7 targets on the LEFT (contralesional / commonly
 * neglected hemifield after right-hemisphere stroke) and 3 on the RIGHT.
 * A patient who only scrolls right finds at most 3 numbers and gets stuck.
 * The remaining 7 require active leftward scanning — exactly the
 * therapeutic behaviour the exercise is meant to train.
 *
 * Combined with the visible left/right counter in the HUD the patient (or
 * caregiver) sees the asymmetry directly.
 */
const TARGET_POSITIONS: Array<{ yaw: number; pitch: number }> = [
  // 7 on the left side — neglected hemifield
  { yaw: -135, pitch: -4 },
  { yaw: -105, pitch: 10 },
  { yaw: -85, pitch: -14 },
  { yaw: -65, pitch: 22 },
  { yaw: -45, pitch: -8 },
  { yaw: -25, pitch: 18 },
  { yaw: -10, pitch: -22 },
  // 3 on the right side
  { yaw: 30, pitch: 12 },
  { yaw: 65, pitch: -10 },
  { yaw: 100, pitch: 4 },
];

const LEFT_TOTAL = TARGET_POSITIONS.filter((p) => p.yaw < 0).length;
const RIGHT_TOTAL = TARGET_POSITIONS.length - LEFT_TOTAL;

type Phase = 'permission' | 'playing' | 'won';

function targetMarkerHtml(id: number): string {
  return `<div class="psv-target"><span>${id}</span></div>`;
}

/** Internal marker id stays 1..10 (the capture-detection logic depends
 *  on it), only the visible label rotates: round 1 shows 1–10, round 2
 *  shows 11–20, etc. Gives the patient a clear "this is a new round"
 *  cue without changing therapeutic mechanics. */
function buildMarkers(roundIndex: number) {
  const labelOffset = roundIndex * TOTAL_TARGETS;
  return TARGET_POSITIONS.map((p, i) => ({
    id: `target-${i + 1}`,
    position: { yaw: `${p.yaw}deg`, pitch: `${p.pitch}deg` },
    html: targetMarkerHtml(labelOffset + i + 1),
    anchor: 'center center',
  }));
}

/* ============================================================
   Component
   ============================================================ */

export function NeglectGo() {
  const t = useTranslations('NeglectGo');
  const locale = useLocale();

  const [phase, setPhase] = useState<Phase>('permission');
  const [error, setError] = useState<string | null>(null);
  const [capturedIds, setCapturedIds] = useState<Set<number>>(() => new Set());
  const [lockingId, setLockingId] = useState<number | null>(null);
  const [lockProgress, setLockProgress] = useState(0);
  const [lastCapturedId, setLastCapturedId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const markersPluginRef = useRef<MarkersPlugin | null>(null);
  const gyroPluginRef = useRef<GyroscopePlugin | null>(null);
  const lockingIdRef = useRef<number | null>(null);
  const lockStartedAtRef = useRef<number | null>(null);
  const capturedIdsRef = useRef<Set<number>>(new Set());
  /** Index into PANORAMA_URLS. Stored as ref because the viewer is
   *  mounted/unmounted via the phase transition, and the ref is read
   *  at mount time — no React render needs to react to it. */
  const roundIndexRef = useRef(0);

  // DEV/test skip: `/apps/neglect-go?round=N` salta il PermissionGate
  // e inizia al round N (1-indexed). La pagina /apps/[slug] è static-
  // rendered (generateStaticParams), quindi useState() non vede i query
  // param all'inizializzazione — vanno letti DOPO il mount lato client
  // con useEffect + window.location.search. Es. ?round=6 → Venezia.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('round');
    if (!raw) return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return;
    const idx = Math.min(n, PANORAMA_URLS.length) - 1;
    roundIndexRef.current = idx;
    setPhase('playing');
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturedCount = capturedIds.size;
  // Split the captured set by side so the HUD makes the contralesional
  // bias explicit (and visible to caregivers / clinicians).
  const leftFound = TARGET_POSITIONS.reduce(
    (acc, p, i) =>
      acc + (p.yaw < 0 && capturedIds.has(i + 1) ? 1 : 0),
    0,
  );
  const rightFound = capturedCount - leftFound;

  /* Keep ref in sync with state — capture loop reads ref to avoid stale closure. */
  useEffect(() => {
    capturedIdsRef.current = capturedIds;
  }, [capturedIds]);

  /* ---- PSV viewer lifecycle ---- */
  useEffect(() => {
    if (phase !== 'playing') return;
    const container = containerRef.current;
    if (!container) return;

    const viewer = new Viewer({
      container,
      panorama: PANORAMA_URLS[roundIndexRef.current],
      navbar: false,
      mousewheel: false,
      touchmoveTwoFingers: false,
      defaultYaw: '0deg',
      defaultPitch: '0deg',
      plugins: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [MarkersPlugin as any, { markers: buildMarkers(roundIndexRef.current) }],
        // Gyroscope plugin: wired but inactive by default. The toggle
        // button in the HUD calls plugin.start() which prompts iOS for
        // motion permission and then drives the camera from device
        // orientation. `touchmove: true` keeps finger drag working as a
        // fine-tune override even while the gyro is active.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [GyroscopePlugin as any, { touchmove: true, moveMode: 'smooth' }],
      ],
    });

    viewerRef.current = viewer;
    markersPluginRef.current = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    const gyro = viewer.getPlugin(GyroscopePlugin) as GyroscopePlugin;
    gyroPluginRef.current = gyro;

    // Auto-activate gyroscope. iOS motion permission was requested in
    // handleStart while still in the user-gesture chain, so this call
    // hits the cached "granted" decision and starts immediately. On
    // Android/desktop where requestPermission doesn't exist, start
    // resolves directly. If the device has no motion sensor at all the
    // promise rejects silently — PSV's default touch panning remains as
    // the silent fallback so the patient is never stuck.
    gyro.start().catch(() => {
      /* sensor unavailable on this device — silent fallback to touch */
    });

    return () => {
      viewer.destroy();
      viewerRef.current = null;
      markersPluginRef.current = null;
      gyroPluginRef.current = null;
    };
  }, [phase]);

  /* ---- Capture detection (rAF) ----
   *
   * Every frame we ask PSV where the camera is pointing, compare to each
   * uncaptured target, and update the lock state machine. PSV does the
   * panning math; we just do the angular distance + countdown. */
  useEffect(() => {
    if (phase !== 'playing') return;

    let rafId = 0;

    function tick() {
      rafId = requestAnimationFrame(tick);
      const viewer = viewerRef.current;
      if (!viewer) return;

      const pos = viewer.getPosition();
      const yawDeg = (pos.yaw * 180) / Math.PI;
      const pitchDeg = (pos.pitch * 180) / Math.PI;

      // Find best candidate target (smallest angular distance, in zone).
      let bestId: number | null = null;
      let bestAngle = Infinity;
      for (let i = 0; i < TARGET_POSITIONS.length; i++) {
        const targetId = i + 1;
        if (capturedIdsRef.current.has(targetId)) continue;
        const target = TARGET_POSITIONS[i];
        const dYaw = ((target.yaw - yawDeg + 540) % 360) - 180;
        const dPitch = target.pitch - pitchDeg;
        const angleDeg = Math.hypot(dYaw, dPitch);
        const radius =
          lockingIdRef.current === targetId
            ? CAPTURE_HYSTERESIS_DEG
            : CAPTURE_RADIUS_DEG;
        if (angleDeg < radius && angleDeg < bestAngle) {
          bestAngle = angleDeg;
          bestId = targetId;
        }
      }

      if (bestId === null) {
        if (lockingIdRef.current !== null) {
          lockingIdRef.current = null;
          lockStartedAtRef.current = null;
          setLockingId(null);
          setLockProgress(0);
        }
        return;
      }

      if (bestId !== lockingIdRef.current) {
        lockingIdRef.current = bestId;
        lockStartedAtRef.current = Date.now();
        setLockingId(bestId);
        setLockProgress(0);
        playLockTick();
        return;
      }

      // Continuing lock on same target → progress
      if (lockStartedAtRef.current !== null) {
        const elapsed = Date.now() - lockStartedAtRef.current;
        const progress = Math.min(1, elapsed / CAPTURE_HOLD_MS);
        setLockProgress(progress);

        if (progress >= 1) {
          const idToCapture = bestId;
          playCaptureSound();
          markersPluginRef.current?.removeMarker(`target-${idToCapture}`);
          setCapturedIds((prev) => {
            const next = new Set(prev);
            next.add(idToCapture);
            return next;
          });
          setLastCapturedId(idToCapture);
          lockingIdRef.current = null;
          lockStartedAtRef.current = null;
          setLockingId(null);
          setLockProgress(0);
        }
      }
    }

    tick();
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  /* ---- Win state ---- */
  useEffect(() => {
    if (phase === 'playing' && capturedCount >= TOTAL_TARGETS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('won');
    }
  }, [capturedCount, phase]);

  /* The Inizia tap is the only safe place to ask iOS for the motion
   * permission: it must run synchronously inside a user-gesture chain.
   * Once granted, iOS caches the decision so PSV's plugin.start() (which
   * runs later, after React has mounted the viewer) gets "granted" back
   * immediately and just starts. On non-iOS browsers requestPermission
   * doesn't exist so we skip straight to the playing phase. */
  const handleStart = useCallback(async () => {
    setError(null);

    const ODE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof ODE.requestPermission === 'function') {
      try {
        const result = await ODE.requestPermission();
        if (result !== 'granted') {
          setError(t('errorMotion'));
          return;
        }
      } catch {
        setError(t('errorMotion'));
        return;
      }
    }

    setPhase('playing');
  }, [t]);

  /** "Continua" handler from the WonOverlay. Cycles to the next
   *  panorama (mod array length), resets all gameplay state, and
   *  transitions phase 'won' → 'playing'. The viewer effect tears
   *  down (it was already destroyed when entering 'won') and rebuilds
   *  on the next render, reading roundIndexRef to pick the new
   *  panorama URL and the new label offset. */
  const handleReset = useCallback(() => {
    capturedIdsRef.current = new Set();
    setCapturedIds(new Set());
    setLastCapturedId(null);
    setLockingId(null);
    setLockProgress(0);
    lockingIdRef.current = null;
    lockStartedAtRef.current = null;

    roundIndexRef.current =
      (roundIndexRef.current + 1) % PANORAMA_URLS.length;
    setPhase('playing');
  }, []);

  /* ---- Render ---- */
  if (phase === 'permission') {
    return (
      <PermissionGate
        onStart={handleStart}
        error={error}
        backHref={`/${locale}`}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden text-paper select-none"
      style={{ background: 'var(--color-bone)' }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      />

      <Reticle locking={lockingId !== null} progress={lockProgress} />

      {lastCapturedId !== null && (
        <CaptureBurst key={`burst-${lastCapturedId}`} />
      )}

      <header
        className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingLeft: 'max(14px, env(safe-area-inset-left))',
          paddingRight: 'max(14px, env(safe-area-inset-right))',
          paddingBottom: '12px',
        }}
      >
        <Link
          href={`/${locale}`}
          aria-label="back"
          className="w-10 h-10 flex items-center justify-center rounded-[12px] active:scale-[0.96]"
          style={{
            background: 'oklch(0.18 0.015 60 / 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid oklch(1 0 0 / 0.18)',
            color: 'oklch(0.99 0.005 80)',
            transition: 'transform var(--dur-quick) var(--ease-snap)',
          }}
        >
          <ArrowRightIcon size={16} className="rotate-180" />
        </Link>

        <div className="flex items-center gap-1.5">
          <SidePill side="left" found={leftFound} total={LEFT_TOTAL} />
          <SidePill side="right" found={rightFound} total={RIGHT_TOTAL} />
        </div>
      </header>

      <AnimatePresence>
        {phase === 'won' && (
          <WonOverlay backHref={`/${locale}`} onReplay={handleReset} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   SidePill — per-side captured counter
   ============================================================ */

function SidePill({
  side,
  found,
  total,
}: {
  side: 'left' | 'right';
  found: number;
  total: number;
}) {
  const isComplete = found >= total;
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px]"
      style={{
        background: 'oklch(0.18 0.015 60 / 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid oklch(1 0 0 / 0.18)',
        opacity: isComplete ? 0.55 : 1,
        transition: 'opacity var(--dur-base) var(--ease-out)',
      }}
    >
      <span
        className="text-[15px] font-bold leading-none"
        style={{ color: 'oklch(0.99 0.005 80)' }}
        aria-hidden
      >
        {side === 'left' ? '←' : '→'}
      </span>
      <span className="font-mono text-[14px] font-bold tabular-nums leading-none">
        <span className="text-paper">{found}</span>
        <span className="text-paper/55">/{total}</span>
      </span>
    </div>
  );
}

/* ============================================================
   PermissionGate
   ============================================================ */

function PermissionGate({
  onStart,
  error,
  backHref,
}: {
  onStart: () => void;
  error: string | null;
  backHref: string;
}) {
  const t = useTranslations('NeglectGo');
  const tCommon = useTranslations('Common');

  return (
    <div className="absolute inset-0 flex flex-col bg-bone">
      <header
        className="flex-shrink-0 flex items-center h-12"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingTop: 'max(8px, env(safe-area-inset-top))',
        }}
      >
        <Link
          href={backHref}
          aria-label={tCommon('back')}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] text-ink active:scale-[0.96]"
          style={{
            border: '1px solid var(--ink-line)',
            transition: `transform var(--dur-quick) var(--ease-snap)`,
          }}
        >
          <ArrowRightIcon size={15} className="rotate-180" />
        </Link>
      </header>

      <div className="flex-1 flex flex-col justify-center px-7 max-w-md mx-auto w-full">
        <p className="eyebrow mb-3">{t('eyebrow')}</p>
        <h1 className="font-display font-bold italic text-[34px] leading-[1.0] tracking-[-0.02em] text-ink">
          {t('title')}
        </h1>
        <p className="mt-4 text-[15px] text-ink-2 leading-relaxed">
          {t('intro')}
        </p>
        <ul className="mt-5 space-y-2.5">
          <Step number="1" text={t('step1')} />
          <Step number="2" text={t('step2')} />
          <Step number="3" text={t('step3')} />
        </ul>

        {error && (
          <div
            className="mt-5 rounded-[12px] px-4 py-3 text-[13px]"
            style={{
              background: 'oklch(0.95 0.04 25)',
              border: '1px solid var(--color-alert)',
              color: 'var(--color-ink)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        className="flex-shrink-0 flex items-center justify-center pb-6"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 h-12 px-7 rounded-[14px] text-paper font-sans font-semibold text-[15px] tracking-[0.01em] active:scale-[0.98]"
          style={{
            background: 'var(--color-accent)',
            transition: `transform var(--dur-quick) var(--ease-snap)`,
          }}
        >
          <span>{t('cta')}</span>
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-pill flex items-center justify-center font-mono text-[11px] font-bold"
        style={{
          background: 'var(--color-accent-soft)',
          color: 'var(--color-accent-strong)',
        }}
      >
        {number}
      </span>
      <span className="text-[14.5px] text-ink leading-snug">{text}</span>
    </li>
  );
}

/* ============================================================
   Reticle — centre crosshair + lock progress dot
   ============================================================ */

function Reticle({
  locking,
  progress,
}: {
  locking: boolean;
  progress: number;
}) {
  return (
    <div
      aria-hidden
      className="absolute top-1/2 left-1/2 pointer-events-none z-10"
      style={{
        width: 56,
        height: 56,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: locking
            ? '2px solid var(--color-accent)'
            : '2px solid oklch(0.99 0.005 80 / 0.85)',
          boxShadow:
            '0 0 0 3px oklch(0.18 0.015 60 / 0.18), 0 4px 8px oklch(0.18 0.015 60 / 0.28)',
          transition: 'border-color var(--dur-quick) var(--ease-snap)',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 rounded-full"
        style={{
          width: 8,
          height: 8,
          marginLeft: -4,
          marginTop: -4,
          background: locking
            ? 'var(--color-accent)'
            : 'oklch(0.99 0.005 80 / 0.95)',
          transform: `scale(${1 + progress * 1.2})`,
          transition:
            'background var(--dur-quick) var(--ease-snap), transform 80ms linear',
        }}
      />
      {locking && (
        <svg
          className="absolute -top-2 -left-2"
          width="76"
          height="76"
          viewBox="0 0 76 76"
        >
          <circle
            cx="38"
            cy="38"
            r="34"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress)}`}
            strokeLinecap="round"
            transform="rotate(-90 38 38)"
          />
        </svg>
      )}
    </div>
  );
}

/* ============================================================
   CaptureBurst — particle burst at screen centre on capture
   ============================================================ */

function CaptureBurst() {
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 4 + Math.random() * 4,
        duration: 0.55 + Math.random() * 0.2,
      };
    }),
  );
  return (
    <div
      aria-hidden
      className="absolute top-1/2 left-1/2 pointer-events-none z-10"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            background: 'var(--color-accent)',
            borderRadius: '999px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
          transition={{ duration: p.duration, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   WonOverlay
   ============================================================ */

function WonOverlay({
  backHref,
  onReplay,
}: {
  backHref: string;
  onReplay: () => void;
}) {
  const t = useTranslations('NeglectGo');
  const tCommon = useTranslations('Common');
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: 'oklch(0.18 0.015 60 / 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-[24px] p-6 text-center"
        style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--ink-line)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <p className="eyebrow text-grow mb-2">{t('wonEyebrow')}</p>
        <h2 className="font-display font-bold italic text-[28px] tracking-[-0.025em] leading-[1.0] text-ink">
          {t('wonTitle')}
        </h2>
        <p className="mt-3 text-[14.5px] text-ink-2 leading-snug">
          {t('wonBody')}
        </p>
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
            onClick={onReplay}
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
