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
  ArrowUpRight,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen pb-32 relative">
      <header className="px-5 pt-14 pb-6 relative animate-fade-in">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-secondary text-sm font-medium capitalize">{dateStr}</p>
            {lastMood && (
              <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <span className="text-base">{moodEmojis[lastMood]}</span>
                <span className="text-text-secondary text-xs font-medium">
                  {moodLabels[lastMood]}
                </span>
              </div>
            )}
          </div>
          <h1 className="text-text text-3xl font-bold tracking-tight">
            {greeting},
          </h1>
          <h2 className="text-4xl font-bold tracking-tight gradient-text-primary leading-tight">
            {name} 👋
          </h2>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-5">
        {!completed ? (
          <button
            onClick={() => router.push('/diario')}
            className="w-full relative overflow-hidden rounded-3xl text-left animate-fade-in active:scale-[0.98] transition-all group"
          >
            <div className="absolute inset-0 gradient-primary" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-3">
                    <Sparkles size={12} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">2 minuti</span>
                  </div>
                  <p className="text-2xl font-bold leading-tight">Diario di oggi</p>
                  <p className="text-white/80 text-sm mt-1">Compila il tuo report giornaliero</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-active:translate-x-1 transition-transform">
                  <ArrowUpRight size={20} />
                </div>
              </div>
            </div>
          </button>
        ) : (
          <div className="w-full glass-strong rounded-3xl p-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-success rounded-2xl blur-lg opacity-30" />
                <div className="relative w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-success/30">
                  <CheckCircle2 size={24} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <p className="font-bold text-text">Diario completato!</p>
                <p className="text-sm text-text-secondary">Ottimo lavoro, continua così</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 animate-fade-in stagger-1">
          <StatCard
            icon={<Flame size={20} className="text-white" strokeWidth={2.5} />}
            iconGradient="gradient-warm"
            value={streak}
            label="Giorni streak"
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-white" strokeWidth={2.5} />}
            iconGradient="gradient-primary"
            value={`${compliance}%`}
            label="Aderenza"
          />
          <StatCard
            icon={<BookOpen size={20} className="text-white" strokeWidth={2.5} />}
            iconGradient="gradient-cool"
            value={entries.filter(e => e.completedAt).length}
            label="Report totali"
          />
        </div>

        <div className="space-y-3 animate-fade-in stagger-2">
          <h2 className="text-xs font-bold text-text-secondary px-1 uppercase tracking-wider">Accesso rapido</h2>

          <button
            onClick={() => router.push('/contratto')}
            className="w-full glass rounded-3xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="relative shrink-0">
              <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-40" />
              <div className="relative w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
                <FileText size={20} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text">Il mio contratto</p>
              <p className="text-sm text-text-secondary truncate">Visualizza i tuoi impegni</p>
            </div>
            <ChevronRight size={18} className="text-text-muted shrink-0" />
          </button>

          <button
            onClick={() => router.push('/video')}
            className="w-full glass rounded-3xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="relative shrink-0">
              <div className="absolute inset-0 gradient-warm rounded-2xl blur-md opacity-40" />
              <div className="relative w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center">
                <Video size={20} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text">I miei video</p>
              <p className="text-sm text-text-secondary truncate">Carica e rivedi le sedute</p>
            </div>
            <ChevronRight size={18} className="text-text-muted shrink-0" />
          </button>
        </div>

        {entries.length > 0 && (
          <div className="space-y-3 animate-fade-in stagger-3">
            <h2 className="text-xs font-bold text-text-secondary px-1 uppercase tracking-wider">Ultimi report</h2>
            {entries
              .filter((e) => e.completedAt)
              .slice(0, 3)
              .map((entry, i) => (
                <div
                  key={entry.id}
                  className={`glass rounded-3xl p-4 animate-fade-in stagger-${Math.min(i + 4, 6)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-white/60 flex items-center justify-center text-2xl">
                        {moodEmojis[entry.mood || 3]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text capitalize">
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
                          className={`w-2 h-2 rounded-full ${
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
                    <p className="text-xs text-text-secondary mt-2 line-clamp-1 italic pl-1 border-l-2 border-primary/30 ml-1 pl-3">
                      {entry.notes}
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

function StatCard({
  icon,
  iconGradient,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconGradient: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="glass rounded-3xl p-4 text-center">
      <div className="relative inline-block">
        <div className={`absolute inset-0 ${iconGradient} rounded-2xl blur-md opacity-40`} />
        <div className={`relative w-10 h-10 rounded-2xl ${iconGradient} flex items-center justify-center mx-auto`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-text mt-2 tracking-tight">{value}</p>
      <p className="text-[10px] text-text-secondary mt-0.5 font-medium">{label}</p>
    </div>
  );
}
