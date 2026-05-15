'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Send, Sparkles, BookOpen, Video, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ChatMsg {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cta?: { label: string; href: string };
}

function buildProactiveMessages(args: {
  isF: boolean;
  todayCompleted: boolean;
  hasVideoToday: boolean;
  streak: number;
  name: string;
}): ChatMsg[] {
  const { isF, todayCompleted, hasVideoToday, streak, name } = args;
  const past = (m: string, f: string) => (isF ? f : m);
  const msgs: ChatMsg[] = [];

  msgs.push({
    id: 'greet',
    role: 'assistant',
    text: `Ciao ${name}! Sono il tuo assistente. Posso ricordarti cosa fare ogni giorno per restare in pista.`,
  });

  if (!todayCompleted) {
    msgs.push({
      id: 'diary-cta',
      role: 'assistant',
      text: `Oggi non hai ancora compilato il diario. Ti va di farlo adesso? Ci vogliono 2 minuti.`,
      cta: { label: 'Apri diario', href: '/diario' },
    });
  } else if (streak >= 3) {
    msgs.push({
      id: 'streak-praise',
      role: 'assistant',
      text: `Diario di oggi fatto. ${streak} giorni di fila — sei ${past('davvero costante', 'davvero costante')}!`,
    });
  } else {
    msgs.push({
      id: 'diary-done',
      role: 'assistant',
      text: `Hai già compilato il diario di oggi. Bravo${past('', 'a')}!`,
    });
  }

  if (!hasVideoToday) {
    msgs.push({
      id: 'video-cta',
      role: 'assistant',
      text: `Hai un video di una sessione da caricare? Caricalo qui — il tuo terapista lo vedrà.`,
      cta: { label: 'Carica video', href: '/video' },
    });
  }

  return msgs;
}

export default function ChatAssistant() {
  const router = useRouter();
  const { user, todayCompleted, getStreak, videos } = useAppStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isF = user?.sex === 'F';
  const name = user?.name?.split(' ')[0] || 'Mario';
  const today = new Date().toISOString().split('T')[0];
  const hasVideoToday = videos.some((v) => v.date === today);

  useEffect(() => {
    if (open && history.length === 0) {
      setHistory(buildProactiveMessages({
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
  }, [open, history]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text };
    setHistory((h) => [...h, userMsg]);
    setInput('');
    setTimeout(() => {
      const reply: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'Sto ancora imparando a rispondere a domande libere. Per ora ti suggerisco di compilare il diario o caricare un video — sono le cose che ti aiutano di più nel percorso.',
      };
      setHistory((h) => [...h, reply]);
    }, 500);
  }

  if (!user || user.role !== 'patient') return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Apri assistente"
          className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full gradient-primary text-white shadow-2xl shadow-primary/40 glow-primary animate-pulse-glow active:scale-95 transition-transform flex items-center justify-center"
        >
          <MessageCircle size={24} strokeWidth={2.5} />
        </button>
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
                    <p className="text-sm leading-relaxed">{m.text}</p>
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
            </div>

            <form onSubmit={handleSend} className="px-4 pb-6 pt-2 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi un messaggio…"
                className="flex-1 bg-white/70 border border-white/80 rounded-2xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim()}
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
