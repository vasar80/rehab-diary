'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { getPatient, savePatient } from './firestore';
import { UserRole } from './types';

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
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, sex?: 'M' | 'F') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const role: UserRole = fbUser.email?.includes('admin') || fbUser.email?.includes('therapist')
          ? 'admin'
          : 'patient';
        let sex: 'M' | 'F' | undefined;
        if (role === 'patient') {
          try {
            const patient = await getPatient(fbUser.uid);
            sex = patient?.sex;
          } catch {}
        }
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || '',
          role,
          sex,
          patientId: role === 'patient' ? fbUser.uid : undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, name: string, role: UserRole, sex?: 'M' | 'F') {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    if (role === 'patient') {
      try {
        await Promise.race([
          savePatient({
            id: cred.user.uid,
            name,
            email,
            sex,
            startDate: new Date().toISOString().split('T')[0],
            therapistId: '',
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000)),
        ]);
      } catch {
        console.warn('Could not save patient to Firestore, will retry later');
      }
    }
    setUser({
      uid: cred.user.uid,
      email,
      displayName: name,
      role,
      sex,
      patientId: role === 'patient' ? cred.user.uid : undefined,
    });
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
