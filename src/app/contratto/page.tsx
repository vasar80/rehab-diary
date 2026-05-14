'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Target,
  CalendarCheck,
  Clock,
  BookOpen,
  Hand,
  Accessibility,
  TrendingDown,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Settings,
  UserCheck,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const iconMap: Record<string, React.ReactNode> = {
  'calendar-check': <CalendarCheck size={20} />,
  clock: <Clock size={20} />,
  'book-open': <BookOpen size={20} />,
  hand: <Hand size={20} />,
  accessibility: <Accessibility size={20} />,
  'trending-down': <TrendingDown size={20} />,
  'biceps-flexed': <Dumbbell size={20} />,
};

export default function ContrattoPage() {
  const router = useRouter();
  const { contractItems, user, getComplianceRate } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [showGeneral, setShowGeneral] = useState(true);
  const [showSpecific, setShowSpecific] = useState(true);

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

  const generalItems = contractItems.filter((ci) => ci.type === 'general');
  const specificItems = contractItems.filter((ci) => ci.type === 'specific');
  const compliance = getComplianceRate();
  const name = user?.name || 'Mario Rossi';

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-5 pt-14 pb-4">
        <div className="mx-auto max-w-md flex items-center">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-xl">
            <ArrowLeft size={22} className="text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text ml-2">Il mio contratto</h1>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-5">
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-primary-light" />
                <span className="text-sm font-medium text-primary-light/80">Contratto riabilitativo</span>
              </div>
              <h2 className="text-xl font-bold mt-2">{name}</h2>
              <p className="text-white/70 text-sm mt-1">
                Stipulato il {format(new Date('2025-04-01'), 'd MMMM yyyy', { locale: it })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{compliance}%</p>
              <p className="text-xs text-white/60 mt-0.5">aderenza</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden animate-fade-in stagger-1">
          <button
            onClick={() => setShowGeneral(!showGeneral)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCheck size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-text">Impegni generali</p>
                <p className="text-xs text-text-secondary">{generalItems.length} impegni</p>
              </div>
            </div>
            {showGeneral ? (
              <ChevronUp size={20} className="text-text-muted" />
            ) : (
              <ChevronDown size={20} className="text-text-muted" />
            )}
          </button>
          {showGeneral && (
            <div className="px-4 pb-4 space-y-2">
              {generalItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 bg-bg-warm rounded-xl p-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary mt-0.5">
                    {iconMap[item.icon] || <Settings size={18} />}
                  </div>
                  <p className="text-sm text-text leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden animate-fade-in stagger-2">
          <button
            onClick={() => setShowSpecific(!showSpecific)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Target size={20} className="text-accent" />
              </div>
              <div>
                <p className="font-semibold text-text">Impegni specifici</p>
                <p className="text-xs text-text-secondary">{specificItems.length} impegni — valutati nel diario</p>
              </div>
            </div>
            {showSpecific ? (
              <ChevronUp size={20} className="text-text-muted" />
            ) : (
              <ChevronDown size={20} className="text-text-muted" />
            )}
          </button>
          {showSpecific && (
            <div className="px-4 pb-4 space-y-2">
              {specificItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 bg-accent-light rounded-xl p-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-accent mt-0.5">
                    {iconMap[item.icon] || <Target size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text leading-relaxed">{item.text}</p>
                    <p className="text-[10px] text-accent font-medium mt-1 uppercase tracking-wider">
                      Valutato quotidianamente
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm animate-fade-in stagger-3">
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            Questo contratto è stato concordato con il tuo terapista.
            Per modificarlo, parlane durante la prossima seduta.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
