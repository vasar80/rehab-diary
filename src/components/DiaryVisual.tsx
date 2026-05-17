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

// Module-level cache so we don't refetch / probe for the same .json on each render
type LottieState = 'unknown' | 'present' | 'missing';
const lottieCache: Record<string, { state: LottieState; data?: unknown }> = {};

export default function DiaryVisual({ type, size = 140 }: Props) {
  const { Icon, gradient, label } = VISUALS[type];
  const cached = lottieCache[type];
  const [state, setState] = useState<LottieState>(cached?.state ?? 'unknown');
  const [data, setData] = useState<unknown>(cached?.data);
  const aborted = useRef(false);

  useEffect(() => {
    aborted.current = false;
    if (cached) return;
    fetch(`/lottie/${type}.json`, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not found'))))
      .then((json) => {
        if (aborted.current) return;
        lottieCache[type] = { state: 'present', data: json };
        setData(json);
        setState('present');
      })
      .catch(() => {
        if (aborted.current) return;
        lottieCache[type] = { state: 'missing' };
        setState('missing');
      });
    return () => {
      aborted.current = true;
    };
  }, [type, cached]);

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
      {state === 'present' && data ? (
        <div className="relative w-full h-full rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-primary/10 overflow-hidden">
          <Lottie animationData={data} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>
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
