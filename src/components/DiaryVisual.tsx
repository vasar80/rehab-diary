'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { PersonStanding, Dumbbell, Hand, Clock, AlertTriangle, LucideIcon } from 'lucide-react';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export type VisualType = 'therapy' | 'duration' | 'hand' | 'posture' | 'compensations';

interface Props {
  type: VisualType;
  size?: number;
}

const VISUALS: Record<VisualType, { Icon: LucideIcon; gradient: string; label: string }> = {
  posture: { Icon: PersonStanding, gradient: 'gradient-cool', label: 'Postura' },
  therapy: { Icon: Dumbbell, gradient: 'gradient-primary', label: 'Terapia' },
  hand: { Icon: Hand, gradient: 'gradient-warm', label: 'Uso della mano' },
  duration: { Icon: Clock, gradient: 'gradient-brand', label: 'Durata' },
  compensations: { Icon: AlertTriangle, gradient: 'gradient-sunset', label: 'Compensi' },
};

// Module-level cache so we don't probe the same asset on each remount
type AssetState = 'unknown' | 'video' | 'lottie' | 'icon';
const assetCache: Record<string, { state: AssetState; lottieData?: unknown }> = {};

export default function DiaryVisual({ type, size = 160 }: Props) {
  const { Icon, gradient, label } = VISUALS[type];
  const cached = assetCache[type];
  const [state, setState] = useState<AssetState>(cached?.state ?? 'unknown');
  const [lottieData, setLottieData] = useState<unknown>(cached?.lottieData);
  const aborted = useRef(false);

  useEffect(() => {
    aborted.current = false;
    if (cached) return;
    (async () => {
      // Tier 1: looping MP4 (e.g. posture.mp4 produced from a Veo render)
      try {
        const r = await fetch(`/animations/${type}.mp4`, { method: 'HEAD' });
        if (r.ok) {
          if (aborted.current) return;
          assetCache[type] = { state: 'video' };
          setState('video');
          return;
        }
      } catch {}
      // Tier 2: Lottie JSON (lighter, vector — when we have it)
      try {
        const r = await fetch(`/lottie/${type}.json`, { cache: 'force-cache' });
        if (r.ok) {
          const json = await r.json();
          if (aborted.current) return;
          assetCache[type] = { state: 'lottie', lottieData: json };
          setLottieData(json);
          setState('lottie');
          return;
        }
      } catch {}
      // Tier 3: Lucide icon fallback (placeholder until we have artwork)
      if (aborted.current) return;
      assetCache[type] = { state: 'icon' };
      setState('icon');
    })();
    return () => {
      aborted.current = true;
    };
  }, [type, cached]);

  if (state === 'video') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[280px] sm:w-[360px]"
      >
        <div className={`absolute inset-0 ${gradient} rounded-3xl blur-2xl opacity-25 scale-110`} />
        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-xl shadow-primary/10 bg-white/40">
          <video
            src={`/animations/${type}.mp4`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label={label}
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{ width: size, height: size }}
    >
      <motion.div
        className={`absolute inset-0 ${gradient} rounded-3xl blur-2xl opacity-30 scale-110`}
        animate={{ scale: [1.1, 1.18, 1.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {state === 'lottie' && lottieData ? (
        <div className="relative w-full h-full rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-primary/10 overflow-hidden">
          <Lottie animationData={lottieData} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>
      ) : state === 'unknown' ? (
        <div className="relative w-full h-full rounded-3xl bg-white/40 shadow-xl shadow-primary/10" />
      ) : (
        <motion.div
          className={`relative w-full h-full rounded-3xl ${gradient} flex items-center justify-center shadow-xl shadow-primary/20`}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={size * 0.48} className="text-white" strokeWidth={1.5} aria-label={label} />
        </motion.div>
      )}
    </motion.div>
  );
}
