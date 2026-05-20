'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { deriveRoleFromEmail, type UserRole } from '@/lib/types';
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
 * Sync della sessione Supabase → zustand store.
 *
 * SENZA questo: quando il paziente arriva tramite magic-link (impersonate
 * o reset password) o quando il login va a buon fine in altro modo che
 * non passa dal form `/login`, lo zustand store resta vuoto. La home
 * (`src/app/page.tsx`) legge `user` dallo store e fa fallback a "Mario"
 * → il paziente impersonato vedeva il profilo demo invece del suo.
 *
 * Strategia: ascolta supabaseUser dal contesto auth. Quando cambia:
 *   - se loggato (vero, non demo) → popola store con id/name/role da
 *     user_metadata
 *   - se logout → svuota lo store (solo se l'utente corrente NON è demo,
 *     così i "Demo Paziente / Demo Terapista" sopravvivono al reload)
 */
function AuthToStoreSync() {
  const { supabaseUser, loading } = useAuth();
  const storeUser = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    if (loading) return;

    if (!supabaseUser) {
      // Logout completo Supabase → reset store solo se NON era un demo
      if (storeUser && !storeUser.isDemo) {
        setUser(null);
      }
      return;
    }

    const meta = (supabaseUser.user_metadata || {}) as Record<string, unknown>;
    const metaName = typeof meta.name === 'string' ? meta.name.trim() : '';
    const email = supabaseUser.email ?? '';
    const name = metaName || email.split('@')[0] || 'Paziente';
    const sex =
      meta.sex === 'M' || meta.sex === 'F' ? (meta.sex as 'M' | 'F') : undefined;

    // Risolvi il ruolo: user_metadata > derivato dall'email
    let role: UserRole = 'patient';
    if (typeof meta.role === 'string') {
      if (meta.role === 'admin' || meta.role === 'super_admin') role = meta.role;
      else if (meta.role === 'patient') role = 'patient';
    } else {
      role = deriveRoleFromEmail(email);
    }

    // Idempotent: se lo store ha già lo stesso user, skip (evita loop in
    // caso di re-render dovuto a refresh del JWT).
    if (
      storeUser &&
      storeUser.id === supabaseUser.id &&
      storeUser.name === name &&
      storeUser.email === email &&
      storeUser.role === role
    ) {
      return;
    }

    setUser({
      id: supabaseUser.id,
      role,
      name,
      email,
      sex,
      isDemo: false,
    });
  }, [supabaseUser, loading, storeUser, setUser]);

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
      <AuthToStoreSync />
      <FirestoreSync />
      <PatientVersionWatcher />
      <DesktopFrame>{children}</DesktopFrame>
      <NotificationsBanner />
    </AuthProvider>
  );
}
