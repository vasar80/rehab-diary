'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import DesktopFrame from './DesktopFrame';
import NotificationsBanner from './NotificationsBanner';
import VersionWatcher from './VersionWatcher';

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

/**
 * Mounts the patient-side VersionWatcher everywhere EXCEPT under
 * /kinora-admin/*. The admin side has its own watcher inside
 * AdminShell so each side polls only its own version endpoint.
 */
function PatientVersionWatcher() {
  const pathname = usePathname();
  if (pathname?.startsWith('/kinora-admin')) return null;
  return <VersionWatcher endpoint="/api/version/patient" tone="patient" />;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FirestoreSync />
      <PatientVersionWatcher />
      <DesktopFrame>{children}</DesktopFrame>
      <NotificationsBanner />
    </AuthProvider>
  );
}
