'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Sparkles,
  Loader2,
  BookOpen,
  Video,
  CalendarDays,
  Menu,
  X,
  Plus,
  ChevronRight,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';

interface ChatMsg {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

type ActionKey = 'diary' | 'video' | 'appointments';

const ACTIONS: { key: ActionKey; icon: React.ReactNode; label: string }[] = [
  { key: 'diary', icon: <BookOpen size={20} strokeWidth={1.7} />, label: 'Compila il diario di oggi' },
  { key: 'video', icon: <Video size={20} strokeWidth={1.7} />, label: 'Carica video' },
  { key: 'appointments', icon: <CalendarDays size={20} strokeWidth={1.7} />, label: 'Prossimi appuntamenti' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, todayCompleted, getStreak, getComplianceRate, entries, videos } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const name = user?.name?.split(' ')[0] || 'Mario';
  const today = new Date().toISOString().split('T')[0];
  const hasVideoToday = videos.some((v) => v.date === today);

  const buildContext = useCallback(() => {
    const sortedVideos = [...videos].sort((a, b) => b.date.localeCompare(a.date));
    let daysSinceLastVideo: number | undefined;
    if (sortedVideos.length > 0) {
      const last = new Date(sortedVideos[0].date);
      daysSinceLastVideo = Math.floor((Date.now() - last.getTime()) / 86400000);
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

  useEffect(() => { setMounted(true); }, []);

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

  function handleAction(key: ActionKey) {
    setMenuOpen(false);
    if (key === 'diary') {
      router.push('/diario');
    } else if (key === 'video') {
      router.push('/video');
    } else if (key === 'appointments') {
      send('Quali sono i miei prossimi appuntamenti di terapia?');
    }
  }

  function handleNewChat() {
    setHistory([]);
    setInput('');
    setMenuOpen(false);
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex-shrink-0 pt-12 pb-3 px-4">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="glass w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Menu"
          >
            <Menu size={20} className="text-text" />
          </button>
          <div className="glass-strong rounded-full px-4 py-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-text font-bold text-sm">Assistente</span>
          </div>
          <button
            onClick={handleNewChat}
            className="glass w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Nuova conversazione"
            title="Nuova conversazione"
          >
            <Plus size={20} className="text-text" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: '260px' }}>
        <div className="mx-auto max-w-md px-5 py-3">
          {history.length === 0 ? (
            <div />
          ) : (
            <div className="space-y-3">
              {history.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[88%] rounded-3xl px-4 py-2.5 ${
                    m.role === 'user'
                      ? 'gradient-primary text-white rounded-br-md shadow-md shadow-primary/30'
                      : 'glass text-text rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
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
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 z-30 pointer-events-none" style={{ bottom: '88px' }}>
        <div className="mx-auto max-w-md px-4 pointer-events-auto">
          <div className="mb-2 space-y-0.5">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => handleAction(a.key)}
                disabled={thinking}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-white/50 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-text-secondary shrink-0">{a.icon}</span>
                <span className="text-text font-medium text-[15px]">{a.label}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chiedi all'assistente…"
              disabled={thinking}
              className="flex-1 glass-strong rounded-full px-5 py-3.5 text-[15px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="w-12 h-12 rounded-full gradient-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-primary/30 glow-primary"
              aria-label="Invia"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] animate-fade-in">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute top-0 bottom-0 left-0 w-[88%] max-w-sm glass-strong p-5 pt-12 flex flex-col" style={{ animation: 'slide-in-left 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-text">RehabDiary</p>
                  <p className="text-[11px] text-text-secondary">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-2 mb-1">Cosa vuoi fare?</p>
              {ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAction(a.key)}
                  className="w-full flex items-center gap-3 px-2 py-3 rounded-xl active:bg-white/50 transition-colors text-left"
                >
                  <span className="text-text-secondary shrink-0">{a.icon}</span>
                  <span className="text-text font-medium text-[15px] flex-1">{a.label}</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-2 mb-1">Conversazione</p>
              <button
                onClick={handleNewChat}
                className="w-full glass rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                  <Plus size={18} className="text-text" />
                </div>
                <span className="text-text font-semibold text-sm flex-1">Nuova conversazione</span>
              </button>
            </div>

            <div className="mt-auto pt-6 text-center">
              <p className="text-[11px] text-text-muted">RehabDiary v1.0</p>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
