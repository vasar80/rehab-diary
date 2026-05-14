'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight, Shield, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const setUser = useAppStore((s) => s.setUser);
  const [mode, setMode] = useState<'patient' | 'admin'>('patient');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name, mode);
      } else {
        await login(email, password);
      }
      setUser({
        id: email,
        role: mode,
        name: name || email.split('@')[0],
        email,
      });
      router.push(mode === 'admin' ? '/admin' : '/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('Email o password non corretti');
      } else if (msg.includes('email-already-in-use')) {
        setError('Questa email è già registrata');
      } else if (msg.includes('weak-password')) {
        setError('La password deve avere almeno 6 caratteri');
      } else if (msg.includes('invalid-email')) {
        setError('Email non valida');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin(role: 'patient' | 'admin') {
    setUser({
      id: role === 'patient' ? 'patient-1' : 'therapist-1',
      role,
      name: role === 'patient' ? 'Mario Rossi' : 'Dr.ssa Laura Bianchi',
      email: role === 'patient' ? 'mario.rossi@email.it' : 'l.bianchi@rehabclinic.it',
    });
    router.push(role === 'admin' ? '/admin' : '/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary-dark to-[#0a5c56] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="animate-scale-in">
          <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm">
            <Heart size={36} className="text-white" />
          </div>
          <h1 className="text-white text-3xl font-bold text-center mt-6">
            RehabDiary
          </h1>
          <p className="text-white/70 text-center mt-2 text-sm max-w-[260px] mx-auto">
            Il tuo compagno quotidiano nel percorso di riabilitazione
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm mt-10 space-y-3 animate-fade-in stagger-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 flex">
            <button
              type="button"
              onClick={() => setMode('patient')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'patient'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/70'
              }`}
            >
              Paziente
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'admin'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/70'
              }`}
            >
              Terapista
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {isRegister && (
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/12 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/12 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/12 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
              <p className="text-white/90 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-primary font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4 active:scale-[0.98] transition-transform shadow-lg shadow-black/10 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus size={18} />
                Registrati
              </>
            ) : (
              <>
                Accedi
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="w-full text-white/60 text-sm py-2 font-medium"
          >
            {isRegister ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
          </button>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-xs">oppure</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('patient')}
              className="flex-1 bg-white/10 text-white/80 text-sm font-medium py-2.5 rounded-xl active:scale-95 transition-transform"
            >
              Demo Paziente
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="flex-1 bg-white/10 text-white/80 text-sm font-medium py-2.5 rounded-xl active:scale-95 transition-transform"
            >
              Demo Terapista
            </button>
          </div>
        </form>
      </div>

      <div className="pb-10 pt-6 flex items-center justify-center gap-2 text-white/40 animate-fade-in stagger-3">
        <Shield size={14} />
        <span className="text-xs">I tuoi dati sono protetti e crittografati</span>
      </div>
    </div>
  );
}
