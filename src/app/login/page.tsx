'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight, Shield } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [mode, setMode] = useState<'patient' | 'admin'>('patient');

  function handleLogin(role: 'patient' | 'admin') {
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

        <div className="w-full max-w-sm mt-12 space-y-3 animate-fade-in stagger-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 flex">
            <button
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
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-white/12 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white/12 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
            />
          </div>

          <button
            onClick={() => handleLogin(mode)}
            className="w-full bg-white text-primary font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4 active:scale-[0.98] transition-transform shadow-lg shadow-black/10"
          >
            Accedi
            <ArrowRight size={18} />
          </button>

          <button className="w-full text-white/60 text-sm py-2 font-medium">
            Password dimenticata?
          </button>
        </div>
      </div>

      <div className="pb-10 pt-6 flex items-center justify-center gap-2 text-white/40 animate-fade-in stagger-3">
        <Shield size={14} />
        <span className="text-xs">I tuoi dati sono protetti e crittografati</span>
      </div>
    </div>
  );
}
