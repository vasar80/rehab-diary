'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ChevronRight,
  Calendar,
  TrendingUp,
  BookOpen,
  Video,
  ArrowLeft,
  Check,
  X,
  Minus,
  Filter,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAppStore } from '@/lib/store';
import { mockPatients, mockEntries, mockVideos, mockContractItems } from '@/lib/mock-data';
import { getPatientsForTherapist, getDailyEntries, getVideos, getContractItems } from '@/lib/firestore';
import { Patient as FsPatient, DailyEntry as FsEntry, RehabVideo as FsVideo, ContractItem as FsCI } from '@/lib/types';

const moodEmojis = ['', '😫', '😔', '😐', '🙂', '😊'];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'risposte' | 'contratto' | 'video'>('risposte');

  const isDemo = !!user?.isDemo;
  const [livePatients, setLivePatients] = useState<FsPatient[]>([]);
  const [liveEntries, setLiveEntries] = useState<FsEntry[]>([]);
  const [liveVideos, setLiveVideos] = useState<FsVideo[]>([]);
  const [liveContracts, setLiveContracts] = useState<FsCI[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isDemo || !user || user.role !== 'admin') return;
    (async () => {
      try {
        const pts = await getPatientsForTherapist(user.id);
        setLivePatients(pts);
        const allEntries: FsEntry[] = [];
        const allVideos: FsVideo[] = [];
        const allContracts: FsCI[] = [];
        for (const p of pts) {
          const [e, v, c] = await Promise.all([
            getDailyEntries(p.id).catch(() => [] as FsEntry[]),
            getVideos(p.id).catch(() => [] as FsVideo[]),
            getContractItems(p.id).catch(() => [] as FsCI[]),
          ]);
          allEntries.push(...e);
          allVideos.push(...v);
          allContracts.push(...c);
        }
        setLiveEntries(allEntries);
        setLiveVideos(allVideos);
        setLiveContracts(allContracts);
      } catch (err) {
        console.warn('Admin Firestore load error', err);
      }
    })();
  }, [mounted, isDemo, user]);

  const patients = isDemo ? mockPatients : livePatients;
  const entries = isDemo ? mockEntries : liveEntries;
  const videos = isDemo ? mockVideos : liveVideos;
  const contractItems = isDemo ? mockContractItems : liveContracts;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const adminName = user?.name?.split(' ')[0] || 'Dottoressa';

  if (selectedPatient) {
    const patient = patients.find((p) => p.id === selectedPatient)!;
    const patientEntries = entries.filter((e) => e.patientId === selectedPatient);
    const patientVideos = videos.filter((v) => v.patientId === selectedPatient);
    const patientContract = contractItems.filter((ci) => ci.patientId === selectedPatient);

    if (!patient) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <p className="text-text-secondary">Paziente non trovato.</p>
          <button onClick={() => setSelectedPatient(null)} className="mt-4 gradient-primary text-white px-6 py-2.5 rounded-2xl font-semibold">
            Torna alla lista
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen pb-12 relative">
        <header className="px-5 pt-14 pb-4 animate-fade-in">
          <div className="mx-auto max-w-md flex items-center gap-3">
            <button onClick={() => setSelectedPatient(null)} className="glass w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
              <ArrowLeft size={20} className="text-text" />
            </button>
            <h1 className="text-xl font-bold text-text">{patient.name}</h1>
          </div>
        </header>

        <main className="px-5 mx-auto max-w-md space-y-4">
          <div className="relative overflow-hidden rounded-3xl animate-fade-in">
            <div className="absolute inset-0 gradient-primary" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
            <div className="relative p-5 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0">
                  {patient.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">{patient.name}</h2>
                  <p className="text-white/80 text-sm truncate">{patient.email}</p>
                  <p className="text-white/60 text-xs mt-1">
                    Dal {format(new Date(patient.startDate), 'd MMMM yyyy', { locale: it })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold">{patientEntries.length}</p>
                  <p className="text-[10px] text-white/70 uppercase font-bold tracking-wider mt-0.5">Report</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold">{patientVideos.length}</p>
                  <p className="text-[10px] text-white/70 uppercase font-bold tracking-wider mt-0.5">Video</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold">
                    {patientEntries.length > 0
                      ? Math.round(
                          (patientEntries.filter((e) => e.didTherapy).length / patientEntries.length) * 100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-[10px] text-white/70 uppercase font-bold tracking-wider mt-0.5">Aderenza</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-1 flex gap-1">
            {(['risposte', 'contratto', 'video'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
                  activeTab === tab
                    ? 'gradient-primary text-white shadow-lg shadow-primary/30'
                    : 'text-text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'risposte' && (
            <div className="space-y-3 animate-fade-in">
              {patientEntries.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">Nessun report disponibile</div>
              ) : (
                patientEntries.map((entry) => (
                  <div key={entry.id} className="glass rounded-3xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center text-xl">
                          {moodEmojis[entry.mood || 3]}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-text capitalize">
                            {format(new Date(entry.date), 'EEEE d MMM', { locale: it })}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {entry.didTherapy
                              ? `Terapia: ${entry.therapyMinutes} min`
                              : 'Nessuna terapia'}
                          </p>
                        </div>
                      </div>
                      {entry.noticedCompensations && (
                        <span className="gradient-warm text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                          Compensi
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {entry.contractResponses.map((r) => {
                        const item = patientContract.find((ci) => ci.id === r.contractItemId);
                        return (
                          <div key={r.contractItemId} className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center ${
                                r.response === 'yes'
                                  ? 'bg-success/20'
                                  : r.response === 'partial'
                                  ? 'bg-warning/20'
                                  : 'bg-danger/20'
                              }`}
                            >
                              {r.response === 'yes' ? (
                                <Check size={12} className="text-success" strokeWidth={3} />
                              ) : r.response === 'partial' ? (
                                <Minus size={12} className="text-warning" strokeWidth={3} />
                              ) : (
                                <X size={12} className="text-danger" strokeWidth={3} />
                              )}
                            </div>
                            <span className="text-xs text-text-secondary truncate">
                              {item?.text || r.contractItemId}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {entry.compensationNotes && (
                      <div className="mt-3 glass-tinted-warm rounded-2xl p-3">
                        <p className="text-xs text-text italic">{entry.compensationNotes}</p>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="mt-2 bg-white/60 rounded-2xl p-3">
                        <p className="text-xs text-text italic">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'contratto' && (
            <div className="space-y-3 animate-fade-in">
              {patientContract.map((item) => (
                <div key={item.id} className="glass rounded-3xl p-4 flex items-start gap-3">
                  <div
                    className={`relative shrink-0`}
                  >
                    <div className={`absolute inset-0 ${item.type === 'general' ? 'gradient-primary' : 'gradient-warm'} rounded-xl blur-md opacity-40`} />
                    <div className={`relative w-9 h-9 rounded-xl ${item.type === 'general' ? 'gradient-primary' : 'gradient-warm'} flex items-center justify-center`}>
                      {item.type === 'general' ? <BookOpen size={16} className="text-white" /> : <TrendingUp size={16} className="text-white" />}
                    </div>
                  </div>
                  <div className="pt-1">
                    <p className="text-sm text-text">{item.text}</p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider mt-1 inline-block ${
                        item.type === 'general' ? 'text-primary' : 'text-accent'
                      }`}
                    >
                      {item.type === 'general' ? 'Generale' : 'Specifico'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-3 animate-fade-in">
              {patientVideos.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">Nessun video caricato</div>
              ) : (
                patientVideos.map((video) => (
                  <div key={video.id} className="glass rounded-3xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 gradient-cool rounded-xl flex items-center justify-center">
                        <Video size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text">{video.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {format(new Date(video.date), 'd MMM yyyy', { locale: it })}
                          {video.duration && ` · ${video.duration}`}
                        </p>
                      </div>
                    </div>
                    {video.notes && (
                      <p className="text-xs text-text-secondary mt-2 italic pl-3 border-l-2 border-primary/30">
                        {video.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 relative">
      <header className="px-5 pt-14 pb-6 animate-fade-in">
        <div className="mx-auto max-w-md">
          <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Dashboard terapista</p>
          <h1 className="text-text text-3xl font-bold mt-1 tracking-tight">
            Ciao,
          </h1>
          <h2 className="text-4xl font-bold gradient-text-primary leading-tight tracking-tight">
            {adminName} 👋
          </h2>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-5">
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <div className="glass rounded-3xl p-4 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-40" />
              <div className="relative w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
                <Users size={20} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text mt-3 tracking-tight">{patients.length}</p>
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider mt-0.5">Pazienti attivi</p>
          </div>
          <div className="glass rounded-3xl p-4 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 gradient-warm rounded-2xl blur-md opacity-40" />
              <div className="relative w-11 h-11 rounded-2xl gradient-warm flex items-center justify-center mx-auto">
                <BarChart3 size={20} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text mt-3 tracking-tight">{entries.length}</p>
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider mt-0.5">Report totali</p>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in stagger-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">I tuoi pazienti</h2>
            <button className="glass w-9 h-9 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
              <Filter size={14} className="text-text-secondary" />
            </button>
          </div>

          {patients.length === 0 && (
            <div className="glass-soft rounded-3xl p-6 text-center text-text-secondary text-sm">
              Nessun paziente assegnato.
              {!isDemo && ' Il super admin deve assegnarti dei pazienti.'}
            </div>
          )}

          {patients.map((patient) => {
            const patientEntries = entries.filter((e) => e.patientId === patient.id);
            const lastEntry = patientEntries[0];
            const lastMood = lastEntry?.mood;

            return (
              <button
                key={patient.id}
                onClick={() => setSelectedPatient(patient.id)}
                className="w-full glass rounded-3xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
              >
                <div className="relative shrink-0">
                  <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-40" />
                  <div className="relative w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                    {patient.name.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text">{patient.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {lastMood && <span className="text-sm">{moodEmojis[lastMood]}</span>}
                    <p className="text-xs text-text-secondary truncate">
                      {lastEntry
                        ? `Ultimo report: ${format(new Date(lastEntry.date), 'd MMM', { locale: it })}`
                        : 'Nessun report'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar size={10} className="text-text-muted" />
                    <p className="text-[10px] text-text-muted">
                      Dal {format(new Date(patient.startDate), 'd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-bold gradient-primary text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {patientEntries.length} report
                  </span>
                  <ChevronRight size={16} className="text-text-muted" />
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full glass rounded-3xl p-4 flex items-center justify-center gap-2 text-text-secondary font-semibold active:scale-[0.98] transition-transform animate-fade-in stagger-3"
        >
          <ArrowLeft size={16} />
          Torna alla vista paziente
        </button>
      </main>
    </div>
  );
}
