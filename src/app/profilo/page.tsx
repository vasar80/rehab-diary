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
  Loader2,
  Lock,
  X,
} from 'lucide-react';
import SideMenu, { HamburgerButton } from '@/components/SideMenu';
import ChatInputBar from '@/components/ChatInputBar';
import Wordmark from '@/components/Wordmark';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

export default function ProfiloPage() {
  const router = useRouter();
  const { user, setUser, entries, contractItems } = useAppStore();
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownerPwdOpen, setOwnerPwdOpen] = useState(false);
  const [ownerPwd, setOwnerPwd] = useState('');
  const [ownerPwdError, setOwnerPwdError] = useState('');

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const name = user?.name || 'Mario Rossi';
  const email = user?.email || 'mario.rossi@email.it';
  const role = user?.role || 'patient';
  const completedEntries = entries.filter((e) => e.completedAt).length;
  const activeContracts = contractItems.filter((ci) => ci.isActive).length;

  function handleOpenOwner() {
    setOwnerPwd('');
    setOwnerPwdError('');
    setOwnerPwdOpen(true);
  }

  function handleOwnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ownerPwd === '66666666') {
      setUser({
        id: 'owner',
        role: 'super_admin',
        name: 'Valerio Sarmati',
        email: 'valeriosarmati@gmail.com',
        isDemo: true,
      });
      setOwnerPwdOpen(false);
      router.push('/super');
    } else {
      setOwnerPwdError('Password errata');
    }
  }

  function handleSwitchToPatient() {
    setUser({
      id: 'patient-1',
      role: 'patient',
      name: 'Mario Rossi',
      email: 'mario.rossi@email.it',
      sex: 'M',
      isDemo: true,
    });
    router.push('/');
  }

  async function handleLogout() {
    try { await logout(); } catch {}
    setUser(null);
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="px-4 pt-12 pb-3 flex-shrink-0">
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <HamburgerButton onClick={() => setMenuOpen(true)} />
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <div className="w-11 h-11" />
        </div>
      </header>

      <main className="flex-1 px-5 mx-auto max-w-md lg:max-w-2xl w-full pb-32">
        <div className="text-center pt-10 animate-fade-in">
          <Wordmark text={name} className="text-5xl font-bold" />
          <p className="text-text-secondary text-sm mt-3">{email}</p>
          <span className="inline-block mt-3 glass rounded-full px-4 py-1 text-xs font-bold text-primary uppercase tracking-wider">
            {role === 'admin' ? 'Terapista' : role === 'super_admin' ? 'Super Admin' : 'Paziente'}
          </span>
        </div>

        <Section title="Il mio percorso" stagger={2}>
          <ListItem
            icon={<FileText size={20} strokeWidth={1.7} className="text-text-secondary" />}
            title="Il mio contratto"
            subtitle={`${activeContracts} impegni attivi`}
            onClick={() => router.push('/contratto')}
          />
          <ListItem
            icon={<Calendar size={20} strokeWidth={1.7} className="text-text-secondary" />}
            title="Storico report"
            subtitle={`${completedEntries} compilazioni`}
            onClick={() => router.push('/video')}
          />
        </Section>

        <Section title="Cambia vista" stagger={3}>
          {role !== 'admin' ? (
            <ListItem
              icon={<LayoutDashboard size={20} strokeWidth={1.7} className="text-text-secondary" />}
              title="Dashboard Proprietario"
              subtitle="Gestione utenti, AI e impostazioni"
              onClick={handleOpenOwner}
            />
          ) : (
            <ListItem
              icon={<Heart size={20} strokeWidth={1.7} className="text-text-secondary" />}
              title="Vista Paziente"
              subtitle="Torna al diario"
              onClick={handleSwitchToPatient}
            />
          )}
        </Section>

        <Section title="Account" stagger={4}>
          <ListItem
            icon={<LogOut size={20} strokeWidth={1.7} className="text-danger" />}
            title="Esci"
            subtitle="Disconnetti il tuo account"
            onClick={handleLogout}
            noChevron
          />
        </Section>

        <div className="text-center pt-6 animate-fade-in stagger-5">
          <p className="text-[11px] text-text-muted">Kinora v1.0</p>
        </div>
      </main>

      <ChatInputBar />

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {ownerPwdOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end animate-fade-in">
          <form onSubmit={handleOwnerSubmit} className="glass-strong w-full rounded-t-[2.5rem] p-5 pb-10 animate-slide-up max-w-md mx-auto">
            <div className="w-12 h-1 bg-text-muted/30 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
                  <Lock size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-text">Area proprietario</h3>
                  <p className="text-[11px] text-text-secondary">Richiesta password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOwnerPwdOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={ownerPwd}
              onChange={(e) => { setOwnerPwd(e.target.value); setOwnerPwdError(''); }}
              placeholder="Password"
              className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
            {ownerPwdError && (
              <p className="text-danger text-sm font-medium mt-2 px-1">{ownerPwdError}</p>
            )}
            <button
              type="submit"
              disabled={!ownerPwd}
              className="w-full mt-3 gradient-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 glow-primary"
            >
              Entra
            </button>
          </form>
        </div>
      )}
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
    <div className={`mt-6 animate-fade-in stagger-${stagger}`}>
      <h2 className="text-[11px] font-bold text-text-secondary px-2 uppercase tracking-wider mb-2">{title}</h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ListItem({
  icon,
  title,
  subtitle,
  onClick,
  noChevron,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  noChevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-white/50 transition-colors text-left"
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text text-[15px]">{title}</p>
        <p className="text-xs text-text-secondary truncate">{subtitle}</p>
      </div>
      {!noChevron && <ChevronRight size={16} className="text-text-muted shrink-0" />}
    </button>
  );
}
