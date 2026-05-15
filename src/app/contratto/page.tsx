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
  'calendar-check': <CalendarCheck size={18} />,
  clock: <Clock size={18} />,
  'book-open': <BookOpen size={18} />,
  hand: <Hand size={18} />,
  accessibility: <Accessibility size={18} />,
  'trending-down': <TrendingDown size={18} />,
  'biceps-flexed': <Dumbbell size={18} />,
};

export default function ContrattoPage() {
  const router = useRouter();
  const { contractItems, user, getComplianceRate } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [showGeneral, setShowGeneral] = useState(true);
  const [showSpecific, setShowSpecific] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const generalItems = contractItems.filter((ci) => ci.type === 'general');
  const specificItems = contractItems.filter((ci) => ci.type === 'specific');
  const compliance = getComplianceRate();
  const name = user?.name || 'Mario Rossi';

  return (
    <div className="min-h-screen pb-32 relative">
      <header className="px-5 pt-14 pb-4 animate-fade-in">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button onClick={() => router.push('/')} className="glass w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} className="text-text" />
          </button>
          <h1 className="text-xl font-bold text-text">Il mio contratto</h1>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md space-y-5">
        <div className="relative overflow-hidden rounded-3xl animate-fade-in">
          <div className="absolute inset-0 gradient-primary" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 mb-3">
                  <Shield size={12} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Contratto</span>
                </div>
                <h2 className="text-2xl font-bold leading-tight">{name}</h2>
                <p className="text-white/80 text-sm mt-1">
                  Stipulato il {format(new Date('2025-04-01'), 'd MMMM yyyy', { locale: it })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-4xl font-bold tracking-tight">{compliance}%</p>
                <p className="text-xs text-white/70 mt-0.5 uppercase tracking-wider font-semibold">aderenza</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl overflow-hidden animate-fade-in stagger-1">
          <button
            onClick={() => setShowGeneral(!showGeneral)}
            className="w-full flex items-center justify-between p-4 text-left active:bg-white/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-40" />
                <div className="relative w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center">
                  <UserCheck size={20} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <p className="font-bold text-text">Impegni generali</p>
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
            <div className="px-3 pb-3 space-y-2 animate-fade-in">
              {generalItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 bg-white/50 rounded-2xl p-3"
                >
                  <div className="w-9 h-9 rounded-xl glass-tinted-primary flex items-center justify-center shrink-0 text-primary mt-0.5">
                    {iconMap[item.icon] || <Settings size={18} />}
                  </div>
                  <p className="text-sm text-text leading-relaxed pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-3xl overflow-hidden animate-fade-in stagger-2">
          <button
            onClick={() => setShowSpecific(!showSpecific)}
            className="w-full flex items-center justify-between p-4 text-left active:bg-white/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 gradient-warm rounded-2xl blur-md opacity-40" />
                <div className="relative w-11 h-11 rounded-2xl gradient-warm flex items-center justify-center">
                  <Target size={20} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <p className="font-bold text-text">Impegni specifici</p>
                <p className="text-xs text-text-secondary">
                  {specificItems.length} impegni — valutati nel diario
                </p>
              </div>
            </div>
            {showSpecific ? (
              <ChevronUp size={20} className="text-text-muted" />
            ) : (
              <ChevronDown size={20} className="text-text-muted" />
            )}
          </button>
          {showSpecific && (
            <div className="px-3 pb-3 space-y-2 animate-fade-in">
              {specificItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 glass-tinted-warm rounded-2xl p-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 text-accent mt-0.5">
                    {iconMap[item.icon] || <Target size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text leading-relaxed">{item.text}</p>
                    <p className="text-[10px] text-accent font-bold mt-1.5 uppercase tracking-wider">
                      Valutato quotidianamente
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-soft rounded-3xl p-5 animate-fade-in stagger-3">
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            Questo contratto è stato concordato con il tuo terapista.<br/>
            Per modificarlo, parlane durante la prossima seduta.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
