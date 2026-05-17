'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Video, CalendarDays, FileText, ChevronRight } from 'lucide-react';
import Wordmark from './Wordmark';

interface HomeWelcomeProps {
  name: string;
  todayCompleted: boolean;
}

export default function HomeWelcome({ name, todayCompleted }: HomeWelcomeProps) {
  const router = useRouter();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  const cards = [
    !todayCompleted && {
      key: 'diary',
      icon: BookOpen,
      title: 'Compila il diario di oggi',
      sub: '2 minuti, ti aiuto io',
      onClick: () => router.push('/?mode=diary'),
      primary: true,
    },
    todayCompleted && {
      key: 'diary-done',
      icon: BookOpen,
      title: 'Diario di oggi: fatto',
      sub: 'Bravo. Possiamo parlare di altro.',
      onClick: undefined,
      primary: false,
    },
    {
      key: 'video',
      icon: Video,
      title: 'Carica un video',
      sub: 'Della tua sessione di terapia',
      onClick: () => router.push('/video'),
      primary: false,
    },
    {
      key: 'appointments',
      icon: CalendarDays,
      title: 'Prossimi appuntamenti',
      sub: 'Calendario del mese',
      onClick: () => router.push('/?prompt=appointments'),
      primary: false,
    },
    {
      key: 'contract',
      icon: FileText,
      title: 'Il mio contratto',
      sub: 'Impegni con il terapista',
      onClick: () => router.push('/?mode=contract'),
      primary: false,
    },
  ].filter(Boolean) as Array<{ key: string; icon: typeof BookOpen; title: string; sub: string; onClick?: () => void; primary: boolean }>;

  return (
    <div className="py-6 animate-fade-in">
      <p className="text-text-secondary text-sm font-medium">{greet}</p>
      <Wordmark text={name} className="text-4xl font-bold leading-tight block mt-1" />
      <p className="text-text-secondary text-sm mt-4">
        Cosa vuoi fare adesso? Tocca una delle azioni qui sotto, oppure scrivimi quello che hai in mente.
      </p>

      <div className="space-y-2 mt-6">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={c.onClick}
            disabled={!c.onClick}
            className={`w-full rounded-3xl p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.98] disabled:active:scale-100 ${
              c.primary
                ? 'gradient-primary text-white shadow-lg shadow-primary/30 glow-primary'
                : 'glass-strong text-text disabled:opacity-70'
            }`}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              c.primary ? 'bg-white/20' : 'bg-primary/10'
            }`}>
              <c.icon size={20} strokeWidth={2} className={c.primary ? 'text-white' : 'text-primary'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[15px] ${c.primary ? 'text-white' : 'text-text'}`}>{c.title}</p>
              <p className={`text-xs mt-0.5 ${c.primary ? 'text-white/80' : 'text-text-secondary'}`}>{c.sub}</p>
            </div>
            {c.onClick && (
              <ChevronRight size={18} className={c.primary ? 'text-white/80' : 'text-text-muted'} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
