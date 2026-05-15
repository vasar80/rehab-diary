'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight, Shield, Loader2, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { auth as firebaseAuth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const setUser = useAppStore((s) => s.setUser);
  const [mode, setMode] = useState<'patient' | 'admin'>('patient');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name, mode, mode === 'patient' ? sex : undefined);
      } else {
        await login(email, password);
      }
      const fbUser = firebaseAuth.currentUser;
      setUser({
        id: fbUser?.uid || email,
        role: mode,
        name: fbUser?.displayName || name || email.split('@')[0],
        email,
        sex: mode === 'patient' ? sex : undefined,
        isDemo: false,
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
      sex: role === 'patient' ? 'M' : 'F',
      isDemo: true,
    });
    router.push(role === 'admin' ? '/admin' : '/');
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="blob-bg blob-teal w-[500px] h-[500px] top-[-200px] left-[-150px] animate-float-blob-1" />
        <div className="blob-bg blob-warm w-[400px] h-[400px] top-[40%] right-[-150px] animate-float-blob-2" />
        <div className="blob-bg blob-purple w-[350px] h-[350px] bottom-[-150px] left-[10%] animate-float-blob-1" style={{ animationDelay: '4s' }} />
        <div className="blob-bg blob-pink w-[300px] h-[300px] top-[20%] left-[40%] opacity-30 animate-float-blob-2" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="animate-scale-in flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-50 scale-110" />
              <div className="relative w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center shadow-2xl glow-primary">
                <Heart size={36} className="text-white" strokeWidth={2.5} fill="white" />
              </div>
            </div>
            <h1 className="text-text text-4xl font-bold text-center mt-6 tracking-tight">
              Rehab<span className="gradient-text-primary">Diary</span>
            </h1>
            <p className="text-text-secondary text-center mt-2 text-sm max-w-[260px]">
              Il tuo compagno quotidiano nel percorso di riabilitazione
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 animate-fade-in stagger-2">
            <div className="glass-strong rounded-3xl p-5 space-y-3">
              <div className="bg-stone-100/60 rounded-2xl p-1 flex">
                <button
                  type="button"
                  onClick={() => setMode('patient')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === 'patient'
                      ? 'gradient-primary text-white shadow-lg shadow-primary/30'
                      : 'text-text-secondary'
                  }`}
                >
                  Paziente
                </button>
                <button
                  type="button"
                  onClick={() => setMode('admin')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === 'admin'
                      ? 'gradient-primary text-white shadow-lg shadow-primary/30'
                      : 'text-text-secondary'
                  }`}
                >
                  Terapista
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {isRegister && (
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                )}
                {isRegister && mode === 'patient' && (
                  <div className="bg-white/70 border border-white/80 rounded-2xl p-1 flex">
                    <button
                      type="button"
                      onClick={() => setSex('M')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        sex === 'M'
                          ? 'gradient-primary text-white shadow-md shadow-primary/30'
                          : 'text-text-secondary'
                      }`}
                    >
                      Uomo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('F')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        sex === 'F'
                          ? 'gradient-primary text-white shadow-md shadow-primary/30'
                          : 'text-text-secondary'
                      }`}
                    >
                      Donna
                    </button>
                  </div>
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-2.5">
                  <p className="text-danger text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 glow-primary disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isRegister ? (
                  <>
                    <UserPlus size={18} />
                    Crea account
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
                className="w-full text-text-secondary text-sm py-1.5 font-medium hover:text-primary transition-colors"
              >
                {isRegister ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
              </button>
            </div>

            <div className="flex items-center gap-3 mt-5 px-1">
              <div className="flex-1 h-px bg-text-muted/20" />
              <span className="text-text-muted text-xs flex items-center gap-1">
                <Sparkles size={12} />
                prova senza account
              </span>
              <div className="flex-1 h-px bg-text-muted/20" />
            </div>

            <div className="flex gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('patient')}
                className="flex-1 glass rounded-2xl py-3 text-sm font-semibold text-text active:scale-95 transition-transform"
              >
                Demo Paziente
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="flex-1 glass rounded-2xl py-3 text-sm font-semibold text-text active:scale-95 transition-transform"
              >
                Demo Terapista
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="pb-10 pt-4 flex items-center justify-center gap-2 text-text-muted animate-fade-in stagger-3">
        <Shield size={14} />
        <span className="text-xs">I tuoi dati sono protetti e crittografati</span>
      </div>
    </div>
  );
}
