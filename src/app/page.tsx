'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';
import SideMenu, { HamburgerButton } from '@/components/SideMenu';
import ProfileButton from '@/components/ProfileButton';
import Wordmark from '@/components/Wordmark';
import { useAppStore } from '@/lib/store';

export default function HomePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}

interface ChatMsg {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, thinking]);

  const send = useCallback(
    async (text: string) => {
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
    },
    [thinking, history, buildContext]
  );

  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const isNew = searchParams.get('new') === '1';
    if (isNew) {
      setHistory([]);
      setInput('');
      router.replace('/');
      return;
    }
    if (prompt === 'appointments') {
      send('Quali sono i miei prossimi appuntamenti di terapia?');
      router.replace('/');
      return;
    }
    try {
      const pending = sessionStorage.getItem('pendingPrompt');
      if (pending) {
        sessionStorage.removeItem('pendingPrompt');
        send(pending);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleNewChat() {
    setHistory([]);
    setInput('');
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
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <HamburgerButton onClick={() => setMenuOpen(true)} />
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <ProfileButton />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: '120px' }}>
        <div className="mx-auto max-w-md lg:max-w-2xl px-5 py-3">
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

      <div className="fixed inset-x-0 z-30 pointer-events-none bottom-5 sm:bottom-6">
        <div className="mx-auto max-w-md lg:max-w-2xl px-4 pointer-events-auto">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chiedi a Kinora…"
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

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
