'use client';

import { motion } from 'framer-motion';

const PINK = '#E85A7A';
const VIOLET = '#322A6E';
const VIOLET_SOFT = '#322A6E';
const VIOLET_GHOST = '#322A6E22';

export type VisualType = 'therapy' | 'duration' | 'hand' | 'posture' | 'compensations';

interface Props {
  type: VisualType;
  size?: number;
}

export default function DiaryVisual({ type, size = 160 }: Props) {
  switch (type) {
    case 'posture': return <PostureAnimation size={size} />;
    case 'therapy': return <TherapyAnimation size={size} />;
    case 'duration': return <DurationAnimation size={size} />;
    case 'hand': return <HandAnimation size={size} />;
    case 'compensations': return <CompensationsAnimation size={size} />;
  }
}

function PostureAnimation({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} fill="none">
      <rect x="35" y="100" width="55" height="8" rx="3" fill={VIOLET_GHOST} />
      <rect x="35" y="60" width="6" height="48" rx="2" fill={VIOLET_GHOST} />
      <line x1="44" y1="108" x2="44" y2="124" stroke={VIOLET_SOFT} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
      <line x1="84" y1="108" x2="84" y2="124" stroke={VIOLET_SOFT} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />

      <motion.path
        d="M65 100 Q65 70 65 38"
        fill="none"
        stroke={VIOLET}
        strokeWidth="6"
        strokeLinecap="round"
        animate={{
          d: [
            'M65 100 Q75 70 65 38',
            'M65 100 Q65 70 65 38',
            'M65 100 Q55 70 65 38',
            'M65 100 Q65 70 65 38',
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.circle
        cy="28"
        r="11"
        fill={VIOLET}
        animate={{ cx: [69, 65, 61, 65] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <line x1="65" y1="100" x2="92" y2="105" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
      <line x1="65" y1="100" x2="85" y2="125" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />

      <motion.line
        x1="65" y1="60"
        x2="50" y2="80"
        stroke={PINK}
        strokeWidth="6"
        strokeLinecap="round"
        animate={{ x2: [50, 52, 48, 50], y2: [80, 78, 82, 80] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

function TherapyAnimation({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} fill="none">
      <circle cx="60" cy="28" r="11" fill={VIOLET} />
      <line x1="60" y1="40" x2="60" y2="90" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
      <line x1="60" y1="90" x2="48" y2="120" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
      <line x1="60" y1="90" x2="72" y2="120" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />

      <motion.g
        style={{ transformOrigin: '60px 55px' }}
        animate={{ rotate: [-30, -160, -30] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <line x1="60" y1="55" x2="60" y2="92" stroke={PINK} strokeWidth="6" strokeLinecap="round" />
        <rect x="52" y="88" width="16" height="10" rx="3" fill={PINK} />
        <rect x="48" y="84" width="4" height="18" rx="2" fill={PINK} />
        <rect x="68" y="84" width="4" height="18" rx="2" fill={PINK} />
      </motion.g>

      <motion.g
        style={{ transformOrigin: '60px 55px' }}
        animate={{ rotate: [30, 160, 30] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <line x1="60" y1="55" x2="60" y2="80" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}

function DurationAnimation({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} fill="none">
      <circle cx="60" cy="60" r="48" stroke={VIOLET} strokeWidth="5" fill="none" />
      <circle cx="60" cy="60" r="48" stroke={VIOLET_GHOST} strokeWidth="2" fill="none" />

      {[0, 90, 180, 270].map((angle) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x1 = 60 + 40 * Math.cos(rad);
        const y1 = 60 + 40 * Math.sin(rad);
        const x2 = 60 + 46 * Math.cos(rad);
        const y2 = 60 + 46 * Math.sin(rad);
        return (
          <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke={VIOLET} strokeWidth="4" strokeLinecap="round" />
        );
      })}

      <motion.line
        x1="60" y1="60" x2="60" y2="32"
        stroke={VIOLET} strokeWidth="5" strokeLinecap="round"
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <motion.line
        x1="60" y1="60" x2="60" y2="22"
        stroke={PINK} strokeWidth="4" strokeLinecap="round"
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <circle cx="60" cy="60" r="4" fill={VIOLET} />
    </svg>
  );
}

function HandAnimation({ size }: { size: number }) {
  const fingers = [
    { x: 42, delay: 0.0 },
    { x: 52, delay: 0.1 },
    { x: 62, delay: 0.2 },
    { x: 72, delay: 0.3 },
  ];
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} fill="none">
      <rect x="38" y="70" width="44" height="50" rx="14" fill={VIOLET} />
      <motion.rect
        x="22" y="78"
        width="14" height="20"
        rx="6"
        fill={VIOLET}
        style={{ transformOrigin: '36px 90px' }}
        animate={{ rotate: [-20, 20, -20] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {fingers.map((f, i) => (
        <motion.rect
          key={i}
          x={f.x}
          width="8"
          rx="4"
          fill={i === 1 || i === 2 ? PINK : VIOLET}
          animate={{
            y: [74, 28, 74],
            height: [14, 50, 14],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: f.delay }}
        />
      ))}
    </svg>
  );
}

function CompensationsAnimation({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} fill="none">
      <motion.g
        style={{ transformOrigin: '60px 110px' }}
        animate={{ x: [-3, 3, -3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <line x1="55" y1="110" x2="55" y2="60" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
        <circle cx="55" cy="48" r="10" fill={VIOLET} />
        <motion.line
          x1="55" y1="68"
          stroke={PINK}
          strokeWidth="6"
          strokeLinecap="round"
          animate={{
            x2: [80, 80, 75, 80],
            y2: [80, 50, 50, 80],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <line x1="55" y1="68" x2="40" y2="85" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
        <line x1="55" y1="110" x2="48" y2="130" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
        <line x1="55" y1="110" x2="62" y2="130" stroke={VIOLET} strokeWidth="6" strokeLinecap="round" />
      </motion.g>

      <motion.g
        animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '110px 50px' }}
      >
        <path d="M110 28 L128 60 L92 60 Z" fill={PINK} />
        <line x1="110" y1="40" x2="110" y2="52" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="110" cy="56" r="1.5" fill="white" />
      </motion.g>
    </svg>
  );
}
