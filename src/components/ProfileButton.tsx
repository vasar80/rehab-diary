'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export default function ProfileButton() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <button
      onClick={() => router.push('/profilo')}
      className="w-11 h-11 rounded-full glass-strong flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Profilo"
    >
      <span className="text-text font-bold text-sm">{initial}</span>
    </button>
  );
}
