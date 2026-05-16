'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, ArrowRight, Loader2, BookOpen, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';

interface ChatMsg {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cta?: { label: string; href: string; icon?: 'diary' | 'video' | 'contract' };
}

function buildOpener(args: {
  todayCompleted: boolean;
  hasVideoToday: boolean;
  streak: number;
  name: string;
  hour: number;
}): ChatMsg[] {
  const { todayCompleted, hasVideoToday, streak, name, hour } = args;
  const greet = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const msgs: ChatMsg[] = [];

  msgs.push({
    id: 'greet',
    role: 'assistant',
    text: `${greet} ${name}. Sono qui se hai voglia di parlare, raccontarmi come va o chiedermi qualcosa sulla terapia.`,
  });

  if (!todayCompleted) {
    msgs.push({
      id: 'diary-cta',
      role: 'assistant',
      text: `Oggi non hai ancora compilato il diario. Quando vuoi, ci vogliono 2 minuti.`,
      cta: { label: 'Apri il diario di oggi', href: '/diario', icon: 'diary' },
    });
  } else if (streak >= 3) {
    msgs.push({
      id: 'streak-praise',
      role: 'assistant',
      text: `Diario di oggi fatto. ${streak} giorni di fila — vera costanza.`,
    });
  } else {
    msgs.push({
      id: 'diary-done',
      role: 'assistant',
      text: `Diario di oggi compilato. Ottimo.`,
    });
  }

  if (!hasVideoToday) {
    msgs.push({
      id: 'video-cta',
      role: 'assistant',
      text: `Se hai un video della seduta, caricalo qui — il tuo terapista lo potrà rivedere.`,
      cta: { label: 'Carica un video', href: '/video', icon: 'video' },
    });
  }

  return msgs;
}

const SUGGESTED_PROMPTS = [
  'Cosa devo fare oggi?',
  'Come va il mio percorso?',
  'Cosa sono i compensi?',
  'Dammi un esercizio facile',
];

export default function HomePage() {
  const router = useRouter();
  const { user, todayCompleted, getStreak, getComplianceRate, entries, videos } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const name = user?.name?.split(' ')[0] || 'Mario';
  const today = new Date().toISOString().split('T')[0];
  const hasVideoToday = videos.some((v) => v.date === today);
  const now = new Date();

  const buildContext = useCallback(() => {
    const sortedVideos = [...videos].sort((a, b) => b.date.localeCompare(a.date));
    let daysSinceLastVideo: number | undefined;
    if (sortedVideos.length > 0) {
      const last = new Date(sortedVideos[0].date);
      daysSinceLastVideo = Math.floor((new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    }
    const completed = entries.filter((e) => e.completedAt).slice(0, 5);
    const recentNotes = completed
      .map((e) => e.notes)
      .filter((n): n is string => !!n && n.trim().length > 0)
      .slice(0, 3);
    const noticedCompensationsRecently = completed.some((e) => e.noticedCompensations);
    const lastEntry = completed[0];
    return {
      name,
      sex: user?.sex,
      todayCompleted: todayCompleted(),
      streak: getStreak(),
      complianceRate: getComplianceRate(),
      lastMood: lastEntry?.mood,
      hasVideoToday,
      daysSinceLastVideo,
      recentNotes,
      noticedCompensationsRecently,
    };
  }, [user, todayCompleted, getStreak, getComplianceRate, entries, videos, name, hasVideoToday]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && history.length === 0) {
      setHistory(buildOpener({
        todayCompleted: todayCompleted(),
        hasVideoToday,
        streak: getStreak(),
        name,
        hour: now.getHours(),
      }));
    }
  }, [mounted, history.length, todayCompleted, hasVideoToday, getStreak, name, now]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, thinking]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setInput('');
    setThinking(true);

    try {
      const firstUserIdx = nextHistory.findIndex((m) => m.role === 'user');
      const apiMessages = nextHistory
        .slice(firstUserIdx >= 0 ? firstUserIdx : 0)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }
      const data = await res.json();
      setHistory((h) => [...h, { id: `a-${Date.now()}`, role: 'assistant', text: data.text || '…' }]);
    } catch (err: unknown) {
      setHistory((h) => [...h, {
        id: `e-${Date.now()}`, role: 'assistant',
        text: `Mi dispiace, c'è stato un problema (${err instanceof Error ? err.message : 'errore'}). Riprova tra poco.`,
      }]);
    } finally {
      setThinking(false);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const dateStr = format(now, 'EEEE d MMMM', { locale: it });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-12 pb-3 flex-shrink-0">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-xs font-medium capitalize">{dateStr}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="relative">
                <div className="absolute inset-0 gradient-primary rounded-xl blur-sm opacity-50" />
                <div className="relative w-8 h-8 gradient-primary rounded-xl flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
              </div>
              <h1 className="text-text font-bold text-lg">Assistente</h1>
              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-success rounded-full inline-block" />
                online
              </span>
            </div>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-3"
        style={{ paddingBottom: '180px' }}
      >
        <div className="mx-auto max-w-md space-y-3">
          {history.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[88%] rounded-3xl px-4 py-2.5 ${
                m.role === 'user'
                  ? 'gradient-primary text-white rounded-br-md shadow-md shadow-primary/30'
                  : 'glass text-text rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                {m.cta && (
                  <button
                    onClick={() => router.push(m.cta!.href)}
                    className="mt-2.5 bg-white/25 hover:bg-white/35 rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {m.cta.icon === 'diary' && <BookOpen size={13} />}
                    {m.cta.icon === 'video' && <Video size={13} />}
                    {m.cta.icon === 'contract' && <FileText size={13} />}
                    {m.cta.label}
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="glass rounded-3xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="text-sm text-text-secondary">sto pensando…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 z-30 pointer-events-none" style={{ bottom: '88px' }}>
        <div className="mx-auto max-w-md px-4 pointer-events-auto">
          {history.length <= 4 && !thinking && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="glass rounded-full px-3 py-1.5 text-xs font-semibold text-text active:scale-95 transition-transform"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrivi un messaggio…"
              disabled={thinking}
              className="flex-1 glass-strong rounded-2xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="w-12 h-12 rounded-2xl gradient-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-primary/30 glow-primary"
              aria-label="Invia"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
