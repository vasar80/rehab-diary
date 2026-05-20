'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase/client';
import { getPatient, savePatient, saveTherapist } from './firestore';
import { UserRole, deriveRoleFromEmail } from './types';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  sex?: 'M' | 'F';
  patientId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: SupabaseUser | null;
  /** @deprecated kept for backwards compatibility with call sites that referenced firebaseUser */
  firebaseUser: SupabaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    sex?: 'M' | 'F'
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  firebaseUser: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

function deriveDisplayName(supaUser: SupabaseUser, fallback?: string): string {
  const meta = supaUser.user_metadata || {};
  return (
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    fallback ||
    supaUser.email?.split('@')[0] ||
    ''
  );
}

async function hydrateAuthUser(supaUser: SupabaseUser): Promise<AuthUser> {
  const email = supaUser.email || '';
  const role = deriveRoleFromEmail(email);
  let sex: 'M' | 'F' | undefined;

  if (role === 'patient') {
    try {
      const patient = await getPatient(supaUser.id);
      sex = patient?.sex;
    } catch {
      // patient profile may not yet exist — fine
    }
  }

  return {
    uid: supaUser.id,
    email,
    displayName: deriveDisplayName(supaUser),
    role,
    sex,
    patientId: role === 'patient' ? supaUser.id : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) Initial session on mount
    supabase()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const s = data.session?.user ?? null;
        setSupabaseUser(s);
        setUser(s ? await hydrateAuthUser(s) : null);
        setLoading(false);
      });

    // 2) Subscribe to auth state changes (login, logout, token refresh)
    const { data: sub } = supabase().auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const s = session?.user ?? null;
      setSupabaseUser(s);
      setUser(s ? await hydrateAuthUser(s) : null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function register(
    email: string,
    password: string,
    name: string,
    role: UserRole,
    sex?: 'M' | 'F'
  ) {
    // Self-signup defaults: if the caller picked "patient" mode, they're a
    // free-tier patient until upgraded. Staff registrations don't go through
    // this form (they're provisioned by the admin panel).
    const tier = role === 'patient' ? 'free' : undefined;
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: {
        data: { name, role, sex, tier }, // stored on auth.users.user_metadata
      },
    });
    if (error) throw error;
    if (!data.user) {
      throw new Error('Registrazione fallita: nessun utente creato.');
    }

    // Supabase anti-enumeration: quando l'email è già registrata, signUp
    // NON ritorna errore. Ritorna un user object dove però `created_at` è
    // il timestamp originale (più vecchio del momento corrente). Per email
    // genuinamente nuove `created_at` ≈ now.
    //
    // IMPORTANTE: il check via `identities.length === 0` (suggerito dai
    // docs ufficiali) NON funziona affidabilmente — supabase-js stripsa
    // l'array delle identities dalla response anche per signUp validi
    // quando l'email-confirmation è abilitata. Quindi usavamo identities
    // come segnale ma davamo "email già usata" anche per signup riusciti.
    const created = new Date(data.user.created_at);
    const ageSec = (Date.now() - created.getTime()) / 1000;
    if (ageSec > 60) {
      // Account preesistente — Supabase non genera errore per non rivelare
      // l'esistenza dell'email, ma il created_at lo tradisce.
      throw new Error(
        'Questa email è già registrata su Kinora. Prova ad accedere invece di registrarti.'
      );
    }

    const effectiveRole: UserRole =
      deriveRoleFromEmail(email) === 'super_admin' ? 'super_admin' : role;

    // For now we still mirror the profile into Firestore so existing diary /
    // contract / video code keeps working. We'll migrate this to a Supabase
    // `kinora.profile` table in the next step.
    try {
      await Promise.race([
        (async () => {
          if (effectiveRole === 'patient') {
            await savePatient({
              id: data.user!.id,
              name,
              email,
              sex,
              startDate: new Date().toISOString().split('T')[0],
              therapistId: '',
            });
          } else if (effectiveRole === 'admin') {
            await saveTherapist({
              id: data.user!.id,
              name,
              email,
              sex,
              createdAt: new Date().toISOString(),
            });
          }
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 5000)
        ),
      ]);
    } catch {
      console.warn('Could not save profile to Firestore, will retry later');
    }

    setUser({
      uid: data.user.id,
      email,
      displayName: name,
      role: effectiveRole,
      sex,
      patientId: effectiveRole === 'patient' ? data.user.id : undefined,
    });
  }

  async function logout() {
    await supabase().auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        firebaseUser: supabaseUser, // alias for old call sites
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
