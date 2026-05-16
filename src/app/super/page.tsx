'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Shield,
  Stethoscope,
  Heart,
  Loader2,
  X,
  Check,
  KeyRound,
  ArrowLeft,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { auth as firebaseAuth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

interface Patient {
  id: string;
  name: string;
  email: string;
  sex?: 'M' | 'F';
  therapistId?: string;
  externalId?: string;
  startDate?: string;
}

interface Therapist {
  id: string;
  name: string;
  email: string;
  sex?: 'M' | 'F';
  specialty?: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'patients' | 'therapists'>('patients');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '', password: '', sex: 'M' as 'M' | 'F', specialty: '' });

  const [pwModal, setPwModal] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  async function getToken(): Promise<string> {
    const fb = firebaseAuth.currentUser;
    if (!fb) throw new Error('Non autenticato');
    return await fb.getIdToken();
  }

  const load = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setPatients(data.patients || []);
      setTherapists(data.therapists || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'super_admin') {
      router.push('/');
      return;
    }
    load();
  }, [mounted, user, router, load]);

  async function handleAssign(patientId: string, therapistId: string) {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/assign-patient', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, therapistId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, therapistId } : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore assegnazione');
    }
  }

  async function handleSetExternalId(patientId: string, externalId: string) {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/set-external-id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, externalId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, externalId } : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio ID esterno');
    }
  }

  async function handleCreateTherapist(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/create-therapist', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newTherapist),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      setNewTherapist({ name: '', email: '', password: '', sex: 'M', specialty: '' });
      setShowCreate(false);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore creazione';
      if (msg.includes('email-already-exists')) setCreateError('Email già usata');
      else setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwModal) return;
    setPwSaving(true);
    setPwError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: pwModal.uid, password: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      setPwModal(null);
      setNewPassword('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Errore reset');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  function therapistNameFor(id?: string) {
    if (!id) return '—';
    return therapists.find((t) => t.id === id)?.name || '—';
  }

  function generatePwd() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let p = '';
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setNewTherapist((prev) => ({ ...prev, password: p }));
  }

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 relative">
      <header className="px-5 pt-14 pb-6 animate-fade-in">
        <div className="mx-auto max-w-md flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 glass-tinted-primary rounded-full px-3 py-1 mb-2">
              <Shield size={12} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Super Admin</span>
            </div>
            <h1 className="text-text text-3xl font-bold tracking-tight">Gestione utenti</h1>
            <p className="text-text-secondary text-sm mt-1">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="glass w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform" title="Esci">
            <LogOut size={18} className="text-text-secondary" />
          </button>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        <div className="glass rounded-2xl p-1 flex gap-1 animate-fade-in">
          <button
            onClick={() => setTab('patients')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'patients' ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'text-text-secondary'
            }`}
          >
            <Heart size={14} /> Pazienti ({patients.length})
          </button>
          <button
            onClick={() => setTab('therapists')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'therapists' ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'text-text-secondary'
            }`}
          >
            <Stethoscope size={14} /> Terapisti ({therapists.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : tab === 'patients' ? (
          <div className="space-y-2.5 animate-fade-in">
            {patients.length === 0 ? (
              <div className="glass-soft rounded-3xl p-6 text-center text-text-secondary text-sm">
                Nessun paziente registrato
              </div>
            ) : patients.map((p) => (
              <div key={p.id} className="glass rounded-3xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-40" />
                      <div className="relative w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center text-white font-bold">
                        {p.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-text truncate">{p.name}</p>
                      <p className="text-xs text-text-secondary truncate">{p.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPwModal({ uid: p.id, email: p.email, name: p.name })}
                    className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    title="Reset password"
                  >
                    <KeyRound size={14} className="text-text-secondary" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Stethoscope size={14} className="text-text-muted shrink-0" />
                  <select
                    value={p.therapistId || ''}
                    onChange={(e) => handleAssign(p.id, e.target.value)}
                    className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-medium text-text focus:outline-none focus:border-primary"
                  >
                    <option value="">Nessun terapista</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0">ID gestionale</span>
                  <input
                    type="text"
                    defaultValue={p.externalId || ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (p.externalId || '')) handleSetExternalId(p.id, v);
                    }}
                    placeholder="es. user_patient.123"
                    className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5 animate-fade-in">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full gradient-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all"
            >
              <UserPlus size={18} />
              Aggiungi terapista
            </button>
            {therapists.length === 0 ? (
              <div className="glass-soft rounded-3xl p-6 text-center text-text-secondary text-sm">
                Nessun terapista. Crea il primo con il bottone qui sopra.
              </div>
            ) : therapists.map((t) => {
              const myPatients = patients.filter((p) => p.therapistId === t.id);
              return (
                <div key={t.id} className="glass rounded-3xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 gradient-warm rounded-2xl blur-md opacity-40" />
                        <div className="relative w-11 h-11 gradient-warm rounded-2xl flex items-center justify-center text-white font-bold">
                          {t.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text truncate">{t.name}</p>
                        <p className="text-xs text-text-secondary truncate">{t.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPwModal({ uid: t.id, email: t.email, name: t.name })}
                      className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      title="Reset password"
                    >
                      <KeyRound size={14} className="text-text-secondary" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary mt-2">
                    {myPatients.length} {myPatients.length === 1 ? 'paziente' : 'pazienti'} assegnati
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end animate-fade-in">
          <form onSubmit={handleCreateTherapist} className="glass-strong w-full rounded-t-[2.5rem] p-5 pb-10 animate-slide-up max-w-md mx-auto">
            <div className="w-12 h-1 bg-text-muted/30 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-bold text-text">Nuovo terapista</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newTherapist.name}
                onChange={(e) => setNewTherapist({ ...newTherapist, name: e.target.value })}
                placeholder="Nome completo"
                required
                className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              <input
                type="email"
                value={newTherapist.email}
                onChange={(e) => setNewTherapist({ ...newTherapist, email: e.target.value })}
                placeholder="Email"
                required
                className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTherapist.password}
                  onChange={(e) => setNewTherapist({ ...newTherapist, password: e.target.value })}
                  placeholder="Password provvisoria (min 6)"
                  required
                  minLength={6}
                  className="flex-1 bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
                <button type="button" onClick={generatePwd} className="px-3 glass rounded-2xl text-sm font-semibold text-primary">
                  Genera
                </button>
              </div>
              <div className="bg-white/70 border border-white/80 rounded-2xl p-1 flex">
                <button
                  type="button"
                  onClick={() => setNewTherapist({ ...newTherapist, sex: 'M' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    newTherapist.sex === 'M' ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'text-text-secondary'
                  }`}
                >Uomo</button>
                <button
                  type="button"
                  onClick={() => setNewTherapist({ ...newTherapist, sex: 'F' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    newTherapist.sex === 'F' ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'text-text-secondary'
                  }`}
                >Donna</button>
              </div>
              <input
                type="text"
                value={newTherapist.specialty}
                onChange={(e) => setNewTherapist({ ...newTherapist, specialty: e.target.value })}
                placeholder="Specialità (opzionale)"
                className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              {createError && (
                <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-2.5">
                  <p className="text-danger text-sm font-medium">{createError}</p>
                </div>
              )}
              <button type="submit" disabled={creating} className="w-full gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all disabled:opacity-60">
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                Crea terapista
              </button>
            </div>
          </form>
        </div>
      )}

      {pwModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-end animate-fade-in">
          <form onSubmit={handleResetPassword} className="glass-strong w-full rounded-t-[2.5rem] p-5 pb-10 animate-slide-up max-w-md mx-auto">
            <div className="w-12 h-1 bg-text-muted/30 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-text">Reset password</h3>
                <p className="text-sm text-text-secondary mt-0.5 truncate">{pwModal.name}</p>
              </div>
              <button type="button" onClick={() => { setPwModal(null); setNewPassword(''); setPwError(''); }} className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nuova password provvisoria (min 6)"
                required
                minLength={6}
                className="w-full bg-white/70 border border-white/80 rounded-2xl px-4 py-3.5 text-text focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              {pwError && (
                <div className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-2.5">
                  <p className="text-danger text-sm font-medium">{pwError}</p>
                </div>
              )}
              <button type="submit" disabled={pwSaving} className="w-full gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all disabled:opacity-60">
                {pwSaving ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                Imposta password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
