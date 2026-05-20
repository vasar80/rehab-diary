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
  Download,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import SideMenu, { HamburgerButton } from '@/components/SideMenu';
import ChatInputBar from '@/components/ChatInputBar';
import Wordmark from '@/components/Wordmark';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { getAccessToken, supabase } from '@/lib/supabase/client';
import { KeyRound, Check } from 'lucide-react';

export default function ProfiloPage() {
  const router = useRouter();
  const { user, setUser, entries, contractItems } = useAppStore();
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownerPwdOpen, setOwnerPwdOpen] = useState(false);
  const [ownerPwd, setOwnerPwd] = useState('');
  const [ownerPwdError, setOwnerPwdError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [actionError, setActionError] = useState('');

  // Cambia password
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    if (newPwd.length < 8) {
      setPwdError('Minimo 8 caratteri');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Le due password non coincidono');
      return;
    }
    setPwdSubmitting(true);
    try {
      const { error } = await supabase().auth.updateUser({ password: newPwd });
      if (error) throw error;
      setPwdSaved(true);
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => {
        setPwdOpen(false);
        setPwdSaved(false);
      }, 1400);
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setPwdSubmitting(false);
    }
  }

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
      router.push('/kinora-admin');
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

  async function handleExport() {
    setActionError('');
    setExporting(true);
    try {
      const token = await getAccessToken().catch(() => null);
      if (!token) throw new Error('Devi accedere con un account reale per esportare i dati.');
      const res = await fetch('/api/me/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kinora-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Errore esportazione');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== 'ELIMINA') {
      setActionError('Scrivi ELIMINA in maiuscolo per confermare.');
      return;
    }
    setActionError('');
    setDeleting(true);
    try {
      const token = await getAccessToken().catch(() => null);
      if (!token) throw new Error('Devi accedere con un account reale per cancellare i dati.');
      const res = await fetch('/api/me/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'ELIMINA' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      try { await logout(); } catch {}
      setUser(null);
      router.push('/login');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Errore cancellazione');
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="px-4 pt-12 pb-3 flex-shrink-0 sticky top-0 z-20 backdrop-blur-md bg-white/40 border-b border-white/40">
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

        <Section title="Privacy e dati" stagger={4}>
          <ListItem
            icon={<ShieldCheck size={20} strokeWidth={1.7} className="text-text-secondary" />}
            title="Informativa privacy"
            subtitle="Leggi come trattiamo i tuoi dati"
            onClick={() => router.push('/privacy')}
          />
          <ListItem
            icon={exporting ? <Loader2 size={20} className="animate-spin text-text-secondary" /> : <Download size={20} strokeWidth={1.7} className="text-text-secondary" />}
            title="Esporta i miei dati"
            subtitle="Diritto di portabilità (art. 20 GDPR)"
            onClick={exporting ? undefined : handleExport}
          />
          <ListItem
            icon={<Trash2 size={20} strokeWidth={1.7} className="text-danger" />}
            title="Cancella account e dati"
            subtitle="Diritto all'oblio (art. 17 GDPR)"
            onClick={() => { setDeleteConfirm(''); setActionError(''); setDeleteOpen(true); }}
          />
        </Section>

        {actionError && (
          <div className="mt-3 mx-2 bg-danger/10 border border-danger/30 rounded-2xl px-4 py-2.5">
            <p className="text-danger text-sm font-medium">{actionError}</p>
          </div>
        )}

        <Section title="Account" stagger={5}>
          <ListItem
            icon={<KeyRound size={20} strokeWidth={1.7} className="text-text-secondary" />}
            title="Cambia password"
            subtitle="Imposta una nuova password per il tuo account"
            onClick={() => {
              setPwdOpen(true);
              setNewPwd('');
              setConfirmPwd('');
              setPwdError('');
              setPwdSaved(false);
            }}
          />
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

      {deleteOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end animate-fade-in">
          <form
            onSubmit={(e) => { e.preventDefault(); handleDelete(); }}
            className="glass-strong w-full rounded-t-[2.5rem] p-5 pb-10 animate-slide-up max-w-md mx-auto"
          >
            <div className="w-12 h-1 bg-text-muted/30 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-danger/15 flex items-center justify-center">
                  <Trash2 size={18} className="text-danger" />
                </div>
                <div>
                  <h3 className="font-bold text-text">Cancella account</h3>
                  <p className="text-[11px] text-text-secondary">Azione irreversibile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-text text-sm leading-relaxed mb-3">
              Eliminerò entro 30 giorni tutti i tuoi dati: profilo, diari, contratto, video, sottoscrizioni alle notifiche e file su Drive collegati. L&apos;account Firebase verrà disattivato e cancellato a fine periodo.
            </p>
            <p className="text-text text-sm leading-relaxed mb-3">
              Per confermare, scrivi <strong>ELIMINA</strong> in maiuscolo qui sotto.
            </p>
            <input
              type="text"
              autoFocus
              value={deleteConfirm}
              onChange={(e) => { setDeleteConfirm(e.target.value); setActionError(''); }}
              placeholder="ELIMINA"
              className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-danger focus:bg-white transition-all"
            />
            {actionError && (
              <p className="text-danger text-sm font-medium mt-2 px-1">{actionError}</p>
            )}
            <button
              type="submit"
              disabled={deleteConfirm !== 'ELIMINA' || deleting}
              className="w-full mt-3 bg-danger text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Cancella tutto</>}
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="w-full mt-2 text-text-secondary text-sm py-2 font-medium"
            >
              Annulla
            </button>
          </form>
        </div>
      )}

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

      {pwdOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end animate-fade-in">
          <form
            onSubmit={submitChangePassword}
            className="glass-strong w-full rounded-t-[2.5rem] p-5 pb-10 animate-slide-up max-w-md mx-auto"
          >
            <div className="w-12 h-1 bg-text-muted/30 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <KeyRound size={20} className="text-primary" />
                <h2 className="text-text font-bold text-base">Cambia password</h2>
              </div>
              <button
                type="button"
                onClick={() => setPwdOpen(false)}
                className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-95 transition-transform text-text-secondary"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-text-secondary text-sm mb-4 leading-relaxed">
              La nuova password sostituisce subito quella corrente. Minimo 8
              caratteri.
            </p>

            <input
              type="password"
              placeholder="Nuova password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all mb-2.5"
            />
            <input
              type="password"
              placeholder="Conferma nuova password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
            />

            {pwdError && (
              <div className="mt-3 bg-danger/10 border border-danger/30 rounded-2xl px-4 py-2.5">
                <p className="text-danger text-sm font-medium">{pwdError}</p>
              </div>
            )}

            {pwdSaved && (
              <div className="mt-3 bg-success/10 border border-success/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <Check size={16} className="text-success" />
                <p className="text-success text-sm font-medium">
                  Password aggiornata.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={pwdSubmitting || !newPwd || !confirmPwd}
              className="w-full mt-4 gradient-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 glow-primary"
            >
              {pwdSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvo…
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  Salva nuova password
                </>
              )}
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
