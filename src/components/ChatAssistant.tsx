'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Send, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ChatMsg {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cta?: { label: string; href: string };
}

function buildOpener(args: {
  isF: boolean;
  todayCompleted: boolean;
  hasVideoToday: boolean;
  streak: number;
  name: string;
}): ChatMsg[] {
  const { todayCompleted, hasVideoToday, streak, name } = args;
  const msgs: ChatMsg[] = [];

  msgs.push({
    id: 'greet',
    role: 'assistant',
    text: `Ciao ${name}! Sono qui se hai voglia di parlare, raccontarmi come va o se vuoi che ti ricordi cosa fare oggi.`,
  });

  if (!todayCompleted) {
    msgs.push({
      id: 'diary-cta',
      role: 'assistant',
      text: `Oggi non hai ancora compilato il diario. Vuoi farlo adesso? Ci vogliono 2 minuti.`,
      cta: { label: 'Apri diario', href: '/diario' },
    });
  } else if (streak >= 3) {
    msgs.push({
      id: 'streak-praise',
      role: 'assistant',
      text: `Diario di oggi fatto. ${streak} giorni di fila — costanza vera, complimenti.`,
    });
  }

  if (!hasVideoToday && todayCompleted) {
    msgs.push({
      id: 'video-cta',
      role: 'assistant',
      text: `Se hai un video della sessione di oggi, caricalo qui — il tuo terapista lo potrà rivedere.`,
      cta: { label: 'Carica video', href: '/video' },
    });
  }

  return msgs;
}

export default function ChatAssistant() {
  const router = useRouter();
  const { user, todayCompleted, getStreak, getComplianceRate, entries, videos } = useAppStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isF = user?.sex === 'F';
  const name = user?.name?.split(' ')[0] || 'Mario';
  const today = new Date().toISOString().split('T')[0];
  const hasVideoToday = videos.some((v) => v.date === today);

  const buildContext = useCallback(() => {
    const sortedVideos = [...videos].sort((a, b) => b.date.localeCompare(a.date));
    let daysSinceLastVideo: number | undefined;
    if (sortedVideos.length > 0) {
      const last = new Date(sortedVideos[0].date);
      const now = new Date();
      daysSinceLastVideo = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    }
    const completedEntries = entries.filter((e) => e.completedAt).slice(0, 5);
    const recentNotes = completedEntries
      .map((e) => e.notes)
      .filter((n): n is string => !!n && n.trim().length > 0)
      .slice(0, 3);
    const noticedCompensationsRecently = completedEntries.some((e) => e.noticedCompensations);
    const lastEntry = completedEntries[0];
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
    if (open && history.length === 0) {
      setHistory(buildOpener({
        isF,
        todayCompleted: todayCompleted(),
        hasVideoToday,
        streak: getStreak(),
        name,
      }));
    }
  }, [open, history.length, isF, todayCompleted, hasVideoToday, getStreak, name]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, history, thinking]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text };
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
      const reply: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.text || '…',
      };
      setHistory((h) => [...h, reply]);
    } catch (err: unknown) {
      const reply: ChatMsg = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: `Mi dispiace, ho un problema momentaneo a rispondere (${err instanceof Error ? err.message : 'errore'}). Riprova tra poco.`,
      };
      setHistory((h) => [...h, reply]);
    } finally {
      setThinking(false);
    }
  }

  if (!user || user.role !== 'patient') return null;

  return (
    <>
      {!open && (
        <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="mx-auto max-w-md relative h-32">
            <button
              onClick={() => setOpen(true)}
              aria-label="Apri assistente"
              className="absolute bottom-24 right-5 w-14 h-14 rounded-full gradient-primary text-white shadow-2xl shadow-primary/40 glow-primary animate-pulse-glow active:scale-95 transition-transform flex items-center justify-center pointer-events-auto"
            >
              <MessageCircle size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end animate-fade-in">
          <div className="glass-strong w-full rounded-t-[2.5rem] max-w-md mx-auto flex flex-col" style={{ height: '85vh' }}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-50" />
                  <div className="relative w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center">
                    <Sparkles size={18} className="text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-text">Assistente</p>
                  <p className="text-[11px] text-text-secondary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-success rounded-full inline-block" />
                    online
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform">
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {history.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 ${
                    m.role === 'user'
                      ? 'gradient-primary text-white rounded-br-md'
                      : 'glass text-text rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    {m.cta && (
                      <button
                        onClick={() => { router.push(m.cta!.href); setOpen(false); }}
                        className="mt-2 bg-white/25 hover:bg-white/35 rounded-2xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {m.cta.label} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="glass rounded-3xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span className="text-sm text-text-secondary">sto pensando…</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="px-4 pb-6 pt-2 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi un messaggio…"
                disabled={thinking}
                className="flex-1 bg-white/70 border border-white/80 rounded-2xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="w-12 h-12 rounded-2xl gradient-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-primary/30"
                aria-label="Invia"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
