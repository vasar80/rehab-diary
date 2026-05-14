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

const moodEmojis = ['', '😫', '😔', '😐', '🙂', '😊'];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'risposte' | 'contratto' | 'video'>('risposte');

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

  const adminName = user?.name?.split(' ')[0] || 'Dottoressa';

  if (selectedPatient) {
    const patient = mockPatients.find((p) => p.id === selectedPatient)!;
    const patientEntries = mockEntries.filter((e) => e.patientId === selectedPatient);
    const patientVideos = mockVideos.filter((v) => v.patientId === selectedPatient);
    const patientContract = mockContractItems.filter((ci) => ci.patientId === selectedPatient);

    return (
      <div className="min-h-screen bg-bg pb-8">
        <header className="px-5 pt-14 pb-4">
          <div className="mx-auto max-w-md flex items-center">
            <button onClick={() => setSelectedPatient(null)} className="p-2 -ml-2 rounded-xl">
              <ArrowLeft size={22} className="text-text" />
            </button>
            <h1 className="text-lg font-semibold text-text ml-2">{patient.name}</h1>
          </div>
        </header>

        <main className="px-5 mx-auto max-w-md space-y-4">
          <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-2xl font-bold">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold">{patient.name}</h2>
                <p className="text-white/70 text-sm">{patient.email}</p>
                <p className="text-white/50 text-xs mt-1">
                  Dal {format(new Date(patient.startDate), 'd MMMM yyyy', { locale: it })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{patientEntries.length}</p>
                <p className="text-[10px] text-white/60">Report</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{patientVideos.length}</p>
                <p className="text-[10px] text-white/60">Video</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">
                  {patientEntries.length > 0
                    ? Math.round(
                        (patientEntries.filter((e) => e.didTherapy).length / patientEntries.length) * 100
                      )
                    : 0}
                  %
                </p>
                <p className="text-[10px] text-white/60">Aderenza</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-1 flex gap-1">
            {(['risposte', 'contratto', 'video'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-primary text-white shadow-sm'
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
                <div className="text-center py-12">
                  <p className="text-text-secondary">Nessun report disponibile</p>
                </div>
              ) : (
                patientEntries.map((entry) => (
                  <div key={entry.id} className="bg-surface rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{moodEmojis[entry.mood || 3]}</span>
                        <div>
                          <p className="font-semibold text-sm text-text capitalize">
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
                        <span className="bg-warning-light text-warning text-[10px] font-bold px-2 py-1 rounded-full uppercase">
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
                                  ? 'bg-success-light'
                                  : r.response === 'partial'
                                  ? 'bg-warning-light'
                                  : 'bg-danger-light'
                              }`}
                            >
                              {r.response === 'yes' ? (
                                <Check size={12} className="text-success" />
                              ) : r.response === 'partial' ? (
                                <Minus size={12} className="text-warning" />
                              ) : (
                                <X size={12} className="text-danger" />
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
                      <div className="mt-3 bg-warning-light/50 rounded-lg p-2">
                        <p className="text-xs text-text-secondary italic">{entry.compensationNotes}</p>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="mt-2 bg-bg-warm rounded-lg p-2">
                        <p className="text-xs text-text-secondary italic">{entry.notes}</p>
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
                <div key={item.id} className="bg-surface rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      item.type === 'general' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                    }`}
                  >
                    {item.type === 'general' ? <BookOpen size={16} /> : <TrendingUp size={16} />}
                  </div>
                  <div>
                    <p className="text-sm text-text">{item.text}</p>
                    <span
                      className={`text-[10px] font-semibold uppercase mt-1 inline-block ${
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
                <div className="text-center py-12">
                  <p className="text-text-secondary">Nessun video caricato</p>
                </div>
              ) : (
                patientVideos.map((video) => (
                  <div key={video.id} className="bg-surface rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 bg-stone-200 rounded-lg flex items-center justify-center">
                        <Video size={20} className="text-stone-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">{video.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {format(new Date(video.date), 'd MMM yyyy', { locale: it })}
                          {video.duration && ` · ${video.duration}`}
                        </p>
                      </div>
                    </div>
                    {video.notes && (
                      <p className="text-xs text-text-secondary mt-2 italic">{video.notes}</p>
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
    <div className="min-h-screen bg-bg pb-8">
      <header className="bg-gradient-to-br from-primary to-primary-dark px-5 pt-14 pb-8 rounded-b-3xl">
        <div className="mx-auto max-w-md">
          <p className="text-primary-light/80 text-sm font-medium">Dashboard terapista</p>
          <h1 className="text-white text-2xl font-bold mt-1">
            Ciao, {adminName}
          </h1>
        </div>
      </header>

      <main className="px-5 -mt-4 mx-auto max-w-md space-y-4">
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <div className="bg-surface rounded-2xl p-4 shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Users size={20} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-text mt-2">{mockPatients.length}</p>
            <p className="text-xs text-text-secondary">Pazienti attivi</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
              <BarChart3 size={20} className="text-accent" />
            </div>
            <p className="text-2xl font-bold text-text mt-2">{mockEntries.length}</p>
            <p className="text-xs text-text-secondary">Report totali</p>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in stagger-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold text-text">I tuoi pazienti</h2>
            <button className="p-2 rounded-xl">
              <Filter size={18} className="text-text-muted" />
            </button>
          </div>

          {mockPatients.map((patient) => {
            const patientEntries = mockEntries.filter((e) => e.patientId === patient.id);
            const lastEntry = patientEntries[0];
            const lastMood = lastEntry?.mood;

            return (
              <button
                key={patient.id}
                onClick={() => setSelectedPatient(patient.id)}
                className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text">{patient.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {lastMood && <span className="text-sm">{moodEmojis[lastMood]}</span>}
                    <p className="text-xs text-text-secondary truncate">
                      {lastEntry
                        ? `Ultimo report: ${format(new Date(lastEntry.date), 'd MMM', { locale: it })}`
                        : 'Nessun report'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={10} className="text-text-muted" />
                    <p className="text-[10px] text-text-muted">
                      Dal {format(new Date(patient.startDate), 'd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
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
          className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-text-secondary font-medium active:scale-[0.98] transition-transform animate-fade-in stagger-3"
        >
          <ArrowLeft size={16} />
          Torna alla vista paziente
        </button>
      </main>
    </div>
  );
}
