'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Video, User } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/diario', label: 'Diario', icon: BookOpen },
  { href: '/video', label: 'Video', icon: Video },
  { href: '/profilo', label: 'Profilo', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-3 pointer-events-auto">
        <div className="glass-strong rounded-3xl px-2 py-2 flex items-center justify-around">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-2xl transition-all ${
                  active ? 'text-white' : 'text-text-secondary'
                }`}
              >
                {active && (
                  <span className="absolute inset-0 gradient-primary rounded-2xl shadow-lg shadow-primary/30 -z-0" />
                )}
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  className="relative z-10"
                />
                <span className={`relative z-10 text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
