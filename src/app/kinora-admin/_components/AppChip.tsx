'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface AppChipProps {
  href: string;
  Icon: LucideIcon;
  label: string;
  sublabel?: string;
  /** Tailwind-free gradient string for the icon tile background */
  gradient: string;
  /** Optional small counter badge on the top-right of the tile */
  badge?: number;
}

export function AppChip({ href, Icon, label, sublabel, gradient, badge }: AppChipProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 14,
        padding: '18px 18px 16px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        textDecoration: 'none',
        transition: 'box-shadow 0.12s, transform 0.12s, border-color 0.12s',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(15,23,42,0.10)',
        }}
      >
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <div>
        <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>{sublabel}</div>
        )}
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            minWidth: 20,
            height: 20,
            padding: '0 6px',
            borderRadius: 10,
            background: '#ef4444',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
