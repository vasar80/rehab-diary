'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Flame,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Video,
  FileText,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';

const moodEmojis = ['', '😫', '😔', '😐', '🙂', '😊'];
const moodLabels = ['', 'Pessimo', 'Male', 'Così così', 'Bene', 'Benissimo'];

export default function HomePage() {
  const router = useRouter();
  const { user, todayCompleted, getStreak, getComplianceRate, entries } = useAppStore();
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

  const name = user?.name?.split(' ')[0] || 'Mario';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buongiorno' : now.getHours() < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const dateStr = format(now, "EEEE d MMMM", { locale: it });
  const completed = todayCompleted();
  const streak = getStreak();
  const compliance = getComplianceRate();
  const lastEntry = entries.find((e) => e.completedAt);
  const lastMood = lastEntry?.mood;

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="bg-gradient-to-br from-primary to-primary-dark px-5 pt-14 pb-8 rounded-b-3xl">
        <div className="mx-auto max-w-md">
          <p className="text-primary-light/80 text-sm font-medium capitalize">{dateStr}</p>
          <h1 className="text-white text-2xl font-bold mt-1">
            {greeting}, {name}
          </h1>
          {lastMood && (
            <div className="flex items-center gap-2 mt-3 bg-white/15 rounded-xl px-3 py-2 w-fit">
              <span className="text-lg">{moodEmojis[lastMood]}</span>
              <span className="text-white/90 text-sm">
                Ultimo umore: {moodLabels[lastMood]}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="px-5 -mt-4 mx-auto max-w-md space-y-5">
        {!completed ? (
          <button
            onClick={() => router.push('/diario')}
            className="w-full bg-surface rounded-2xl p-5 shadow-lg shadow-primary/10 border border-primary/20 text-left animate-fade-in active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <BookOpen size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">Diario di oggi</p>
                    <p className="text-sm text-text-secondary">Compila il tuo report giornaliero</p>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-text-muted mt-2" />
            </div>
            <div className="mt-4 flex items-center gap-2 bg-accent/10 rounded-xl px-3 py-2">
              <Sparkles size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent">
                Ci vogliono solo 2 minuti
              </span>
            </div>
          </button>
        ) : (
          <div className="w-full bg-surface rounded-2xl p-5 shadow-sm border border-success/20 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center">
                <CheckCircle2 size={24} className="text-success" />
              </div>
              <div>
                <p className="font-semibold text-text">Diario completato!</p>
                <p className="text-sm text-text-secondary">Ottimo lavoro, continua così</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 animate-fade-in stagger-1">
          <div className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
              <Flame size={20} className="text-accent" />
            </div>
            <p className="text-2xl font-bold text-text mt-2">{streak}</p>
            <p className="text-xs text-text-secondary mt-0.5">Giorni streak</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-text mt-2">{compliance}%</p>
            <p className="text-xs text-text-secondary mt-0.5">Aderenza</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen size={20} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-text mt-2">{entries.filter(e => e.completedAt).length}</p>
            <p className="text-xs text-text-secondary mt-0.5">Report totali</p>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in stagger-2">
          <h2 className="text-lg font-semibold text-text px-1">Accesso rapido</h2>

          <button
            onClick={() => router.push('/contratto')}
            className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text">Il mio contratto</p>
              <p className="text-sm text-text-secondary truncate">Visualizza i tuoi impegni</p>
            </div>
            <ChevronRight size={18} className="text-text-muted shrink-0" />
          </button>

          <button
            onClick={() => router.push('/video')}
            className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-accent-light flex items-center justify-center shrink-0">
              <Video size={20} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text">I miei video</p>
              <p className="text-sm text-text-secondary truncate">Carica e rivedi le sedute</p>
            </div>
            <ChevronRight size={18} className="text-text-muted shrink-0" />
          </button>
        </div>

        {entries.length > 0 && (
          <div className="space-y-3 animate-fade-in stagger-3">
            <h2 className="text-lg font-semibold text-text px-1">Ultimi report</h2>
            {entries
              .filter((e) => e.completedAt)
              .slice(0, 3)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="bg-surface rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{moodEmojis[entry.mood || 3]}</span>
                      <div>
                        <p className="font-medium text-sm text-text capitalize">
                          {format(new Date(entry.date), 'EEEE d MMM', { locale: it })}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {entry.didTherapy
                            ? `${entry.therapyMinutes} min di terapia`
                            : 'Nessuna terapia'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {entry.contractResponses.slice(0, 4).map((r, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            r.response === 'yes'
                              ? 'bg-success'
                              : r.response === 'partial'
                              ? 'bg-warning'
                              : 'bg-danger/40'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-text-secondary mt-2 line-clamp-1 italic">
                      &ldquo;{entry.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
