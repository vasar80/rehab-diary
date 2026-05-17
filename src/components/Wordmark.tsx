'use client';

interface WordmarkProps {
  text: string;
  className?: string;
}

const PINK = '#E85A7A';
const VIOLET = '#322A6E';

export default function Wordmark({ text, className }: WordmarkProps) {
  if (!text) return null;
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <span className={`font-display tracking-tight leading-none ${className || ''}`}>
      <span style={{ color: PINK }}>{first}</span>
      <span style={{ color: VIOLET }}>{rest}</span>
    </span>
  );
}
