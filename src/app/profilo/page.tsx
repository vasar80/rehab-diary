'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  LogOut,
  ChevronRight,
  Heart,
  Calendar,
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

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
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
      isDemo: true,
    });
    router.push('/admin');
  }

  function handleSwitchToPatient() {
    setUser({
      id: 'patient-1',
      role: 'patient',
      name: 'Mario Rossi',
      email: 'mario.rossi@email.it',
      isDemo: true,
    });
    router.push('/');
  }

  function handleLogout() {
    setUser(null);
    router.push('/login');
  }

  return (
    <div className="min-h-screen pb-32 relative">
      <header className="px-5 pt-14 pb-6 animate-fade-in">
        <div className="mx-auto max-w-md flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-50 scale-125" />
            <div className="relative w-24 h-24 gradient-primary rounded-3xl flex items-center justify-center text-3xl font-bold text-white shadow-2xl glow-primary">
              {initials}
            </div>
          </div>
          <h1 className="text-text text-2xl font-bold mt-4">{name}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{email}</p>
          <span className="mt-3 glass rounded-full px-4 py-1 text-xs font-bold text-primary uppercase tracking-wider">
            {role === 'admin' ? 'Terapista' : 'Paziente'}
          </span>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-5">
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          <StatBox value={completedEntries} label="Report" />
          <StatBox value={activeContracts} label="Impegni" />
          <StatBox value={format(new Date('2025-04-01'), 'dd/MM', { locale: it })} label="Inizio" />
        </div>

        <Section title="Il mio percorso" stagger={1}>
          <ListItem
            icon={<FileText size={20} className="text-white" strokeWidth={2.5} />}
            gradient="gradient-primary"
            title="Il mio contratto"
            subtitle={`${activeContracts} impegni attivi`}
            onClick={() => router.push('/contratto')}
          />
          <ListItem
            icon={<Calendar size={20} className="text-white" strokeWidth={2.5} />}
            gradient="gradient-warm"
            title="Storico report"
            subtitle={`${completedEntries} compilazioni`}
            onClick={() => router.push('/video')}
          />
        </Section>

        <Section title="Cambia vista" stagger={2}>
          {role !== 'admin' ? (
            <ListItem
              icon={<LayoutDashboard size={20} className="text-white" strokeWidth={2.5} />}
              gradient="gradient-cool"
              title="Dashboard Terapista"
              subtitle="Visualizza i dati dei pazienti"
              onClick={handleSwitchToAdmin}
            />
          ) : (
            <ListItem
              icon={<Heart size={20} className="text-white" strokeWidth={2.5} />}
              gradient="gradient-primary"
              title="Vista Paziente"
              subtitle="Torna al diario"
              onClick={handleSwitchToPatient}
            />
          )}
        </Section>

        <Section title="Account" stagger={3}>
          <ListItem
            icon={<LogOut size={20} className="text-white" strokeWidth={2.5} />}
            gradient="gradient-sunset"
            title="Esci"
            subtitle="Disconnetti il tuo account"
            onClick={handleLogout}
            noChevron
          />
        </Section>

        <div className="text-center pt-2 animate-fade-in stagger-4">
          <div className="flex items-center justify-center gap-1.5 text-text-muted">
            <Heart size={12} className="text-primary" fill="currentColor" />
            <span className="text-xs font-medium">RehabDiary v1.0</span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function StatBox({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="glass rounded-3xl p-4 text-center">
      <p className="text-2xl font-bold text-text tracking-tight">{value}</p>
      <p className="text-[10px] text-text-secondary mt-0.5 font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Section({
  title,
  children,
  stagger,
}: {
  title: string;
  children: React.ReactNode;
  stagger: number;
}) {
  return (
    <div className={`space-y-2 animate-fade-in stagger-${stagger}`}>
      <h2 className="text-xs font-bold text-text-secondary px-1 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function ListItem({
  icon,
  gradient,
  title,
  subtitle,
  onClick,
  noChevron,
}: {
  icon: React.ReactNode;
  gradient: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
  noChevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full glass rounded-3xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
    >
      <div className="relative shrink-0">
        <div className={`absolute inset-0 ${gradient} rounded-2xl blur-md opacity-40`} />
        <div className={`relative w-11 h-11 rounded-2xl ${gradient} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text text-sm">{title}</p>
        <p className="text-xs text-text-secondary truncate">{subtitle}</p>
      </div>
      {!noChevron && <ChevronRight size={16} className="text-text-muted shrink-0" />}
    </button>
  );
}
