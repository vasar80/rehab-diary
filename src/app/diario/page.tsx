'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DiarioPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/?mode=diary');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  );
}
