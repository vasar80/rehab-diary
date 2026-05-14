'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  Heart,
  Calendar,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';

export default function ProfiloPage() {
  const router = useRouter();
  const { user, setUser, entries, contractItems } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const name = user?.name || 'Mario Rossi';
  const email = user?.email || 'mario.rossi@email.it';
  const role = user?.role || 'patient';
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const completedEntries = entries.filter((e) => e.completedAt).length;
  const activeContracts = contractItems.filter((ci) => ci.isActive).length;

  function handleSwitchToAdmin() {
    setUser({
      id: 'therapist-1',
      role: 'admin',
      name: 'Dr.ssa Laura Bianchi',
      email: 'l.bianchi@rehabclinic.it',
    });
    router.push('/admin');
  }

  function handleSwitchToPatient() {
    setUser({
      id: 'patient-1',
      role: 'patient',
      name: 'Mario Rossi',
      email: 'mario.rossi@email.it',
    });
    router.push('/');
  }

  function handleLogout() {
    setUser(null);
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="bg-gradient-to-br from-primary to-primary-dark px-5 pt-14 pb-8 rounded-b-3xl">
        <div className="mx-auto max-w-md flex flex-col items-center">
          <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center text-2xl font-bold text-white backdrop-blur-sm">
            {initials}
          </div>
          <h1 className="text-white text-xl font-bold mt-3">{name}</h1>
          <p className="text-white/60 text-sm">{email}</p>
          <span className="mt-2 bg-white/15 text-white/90 text-xs font-semibold px-3 py-1 rounded-full capitalize">
            {role === 'admin' ? 'Terapista' : 'Paziente'}
          </span>
        </div>
      </header>

      <main className="px-5 -mt-4 mx-auto max-w-md space-y-4">
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          <div className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-text">{completedEntries}</p>
            <p className="text-xs text-text-secondary mt-0.5">Report</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-text">{activeContracts}</p>
            <p className="text-xs text-text-secondary mt-0.5">Impegni</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-text">
              {format(new Date('2025-04-01'), 'dd/MM', { locale: it })}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">Inizio</p>
          </div>
        </div>

        <div className="space-y-2 animate-fade-in stagger-1">
          <h2 className="text-sm font-semibold text-text-secondary px-1 uppercase tracking-wider">Il mio percorso</h2>

          <button
            onClick={() => router.push('/contratto')}
            className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text text-sm">Il mio contratto</p>
              <p className="text-xs text-text-secondary">{activeContracts} impegni attivi</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>

          <button
            onClick={() => router.push('/video')}
            className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text text-sm">Storico report</p>
              <p className="text-xs text-text-secondary">{completedEntries} compilazioni</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>
        </div>

        <div className="space-y-2 animate-fade-in stagger-2">
          <h2 className="text-sm font-semibold text-text-secondary px-1 uppercase tracking-wider">Cambia vista</h2>

          {role !== 'admin' ? (
            <button
              onClick={handleSwitchToAdmin}
              className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left border border-primary/20"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <LayoutDashboard size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text text-sm">Dashboard Terapista</p>
                <p className="text-xs text-text-secondary">Visualizza i dati dei pazienti</p>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          ) : (
            <button
              onClick={handleSwitchToPatient}
              className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left border border-primary/20"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Heart size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text text-sm">Vista Paziente</p>
                <p className="text-xs text-text-secondary">Torna al diario</p>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          )}
        </div>

        <div className="space-y-2 animate-fade-in stagger-3">
          <h2 className="text-sm font-semibold text-text-secondary px-1 uppercase tracking-wider">Account</h2>
          <button
            onClick={handleLogout}
            className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-danger-light flex items-center justify-center shrink-0">
              <LogOut size={20} className="text-danger" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text text-sm">Esci</p>
              <p className="text-xs text-text-secondary">Disconnetti il tuo account</p>
            </div>
          </button>
        </div>

        <div className="text-center pt-4 animate-fade-in stagger-4">
          <div className="flex items-center justify-center gap-1.5 text-text-muted">
            <Heart size={12} />
            <span className="text-xs">RehabDiary v1.0</span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
