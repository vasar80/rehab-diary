'use client';

import { useEffect, useState, useRef } from 'react';

const PINK = '#E85A7A';
const VIOLET = '#322A6E';

interface Props {
  text: string;
  className?: string;
  speed?: number;
  instant?: boolean;
}

export default function TypewriterTwoColor({ text, className, speed = 22, instant = false }: Props) {
  const [revealed, setRevealed] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (instant || text.length > 500) {
      setRevealed(text);
      return;
    }
    setRevealed('');
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setRevealed(text.slice(0, i));
      if (i >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed, instant]);

  if (!revealed) return <span className={className}>&nbsp;</span>;

  const first = revealed.charAt(0);
  const rest = revealed.slice(1);
  return (
    <span className={className}>
      <span style={{ color: PINK }}>{first}</span>
      <span style={{ color: VIOLET }}>{rest}</span>
    </span>
  );
}
