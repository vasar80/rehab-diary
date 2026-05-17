'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import DesktopFrame from './DesktopFrame';
import NotificationsBanner from './NotificationsBanner';

function FirestoreSync() {
  const user = useAppStore((s) => s.user);
  const firestoreLoaded = useAppStore((s) => s.firestoreLoaded);
  const loadFromFirestore = useAppStore((s) => s.loadFromFirestore);

  useEffect(() => {
    if (user && !user.isDemo && !firestoreLoaded) {
      loadFromFirestore(user.id);
    }
  }, [user, firestoreLoaded, loadFromFirestore]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FirestoreSync />
      <DesktopFrame>{children}</DesktopFrame>
      <NotificationsBanner />
    </AuthProvider>
  );
}
