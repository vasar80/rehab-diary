'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Loader2, Check } from 'lucide-react';
import SideMenu, { HamburgerButton } from '@/components/SideMenu';
import ProfileButton from '@/components/ProfileButton';
import Wordmark from '@/components/Wordmark';
import { useAppStore } from '@/lib/store';
import {
  DiaryAnswer,
  DiaryStep,
  nextStep,
  buildDailyEntryFromAnswer,
} from '@/lib/diary-script';
import { saveDailyEntry } from '@/lib/firestore';

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

function fontClassFor(text: string): string {
  const len = text.length;
  if (len < 30) return 'text-5xl leading-tight';
  if (len < 80) return 'text-4xl leading-tight';
  if (len < 160) return 'text-3xl leading-snug';
  if (len < 300) return 'text-2xl leading-snug';
  if (len < 600) return 'text-xl leading-relaxed';
  return 'text-lg leading-relaxed';
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

  const [mode, setMode] = useState<'free' | 'diary' | 'done'>('free');
  const [diaryAnswer, setDiaryAnswer] = useState<DiaryAnswer>({});
  const [currentStep, setCurrentStep] = useState<DiaryStep | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);

  const name = user?.name?.split(' ')[0] || 'Mario';

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
    const today = new Date().toISOString().split('T')[0];
    return {
      name,
      sex: user?.sex,
      todayCompleted: todayCompleted(),
      streak: getStreak(),
      complianceRate: getComplianceRate(),
      lastMood: lastEntry?.mood,
      hasVideoToday: videos.some((v) => v.date === today),
      daysSinceLastVideo,
      recentNotes,
      noticedCompensationsRecently,
    };
  }, [user, todayCompleted, getStreak, getComplianceRate, entries, videos, name]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, thinking, currentStep]);

  const sendFree = useCallback(
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

  function startDiary() {
    if (todayCompleted()) {
      setMode('done');
      setHistory([{
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Hai già compilato il diario di oggi. Bravo! Torna domani per il prossimo.`,
      }]);
      return;
    }
    const empty: DiaryAnswer = {};
    setDiaryAnswer(empty);
    setMode('diary');
    const first = nextStep(empty, user?.sex);
    if (first) {
      setCurrentStep(first);
      setHistory([{ id: `a-${Date.now()}`, role: 'assistant', text: first.question }]);
      setMultiSelected([]);
    }
  }

  async function advanceDiary(value: string | string[], displayLabel?: string) {
    if (!currentStep) return;
    const userText = Array.isArray(value)
      ? value.join(', ')
      : displayLabel || value;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text: userText };
    setHistory((h) => [...h, userMsg]);

    const parsedValue = currentStep.parse && !Array.isArray(value) ? currentStep.parse(value) : value;
    const updated: DiaryAnswer = { ...diaryAnswer, [currentStep.field]: parsedValue };
    setDiaryAnswer(updated);
    setMultiSelected([]);
    setInput('');

    setTimeout(() => {
      const next = nextStep(updated, user?.sex);
      if (next) {
        setCurrentStep(next);
        setHistory((h) => [...h, { id: `a-${Date.now()}`, role: 'assistant', text: next.question }]);
      } else {
        setCurrentStep(null);
        finishDiary(updated);
      }
    }, 350);
  }

  async function finishDiary(answer: DiaryAnswer) {
    const closing: ChatMsg = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: 'Grazie! Diario salvato. Ci sentiamo domani.',
    };
    setHistory((h) => [...h, closing]);

    const patientId = user?.id || 'patient-1';
    const entry = buildDailyEntryFromAnswer(answer, patientId);

    const store = useAppStore.getState();
    store.updateDiaryDraft({
      mood: entry.mood,
      didTherapy: entry.didTherapy,
      therapyMinutes: entry.therapyMinutes,
      feeling: entry.feeling,
      noTherapyReason: entry.noTherapyReason,
      practicedActions: entry.practicedActions,
      noPracticedActionsReason: entry.noPracticedActionsReason,
      selectedActions: entry.selectedActions,
      handInOtherActivities: entry.handInOtherActivities,
      noHandReason: entry.noHandReason,
      posture: entry.posture,
      noticedCompensations: entry.noticedCompensations,
      compensationTypes: entry.compensationTypes,
      contractResponses: [],
    });
    store.submitDiary();

    if (user && !user.isDemo) {
      try { await saveDailyEntry(entry); } catch {}
    }

    setMode('done');
  }

  useEffect(() => {
    if (!mounted) return;
    const m = searchParams.get('mode');
    const prompt = searchParams.get('prompt');
    const isNew = searchParams.get('new') === '1';
    if (isNew) {
      setHistory([]);
      setInput('');
      setMode('free');
      setCurrentStep(null);
      setDiaryAnswer({});
      router.replace('/');
      return;
    }
    if (m === 'diary') {
      startDiary();
      router.replace('/');
      return;
    }
    if (prompt === 'appointments') {
      sendFree('Quali sono i miei prossimi appuntamenti di terapia?');
      router.replace('/');
      return;
    }
    try {
      const pending = sessionStorage.getItem('pendingPrompt');
      if (pending) {
        sessionStorage.removeItem('pendingPrompt');
        sendFree(pending);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'diary' && currentStep?.type === 'text') {
      advanceDiary(input.trim());
    } else if (mode === 'free') {
      sendFree(input);
    }
  }

  function handleNewChat() {
    setHistory([]);
    setInput('');
    setMode('free');
    setCurrentStep(null);
    setDiaryAnswer({});
    setMultiSelected([]);
  }

  function handleQuickReply(value: string, label: string) {
    if (mode === 'diary' && currentStep) {
      advanceDiary(value, label);
    }
  }

  function handleMultiSelectToggle(value: string) {
    setMultiSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleMultiSelectDone() {
    if (!currentStep) return;
    advanceDiary(multiSelected);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const latestAssistantIdx = (() => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') return i;
    }
    return -1;
  })();
  const latestAssistant = latestAssistantIdx >= 0 ? history[latestAssistantIdx] : null;
  const olderMessages = latestAssistantIdx >= 0 ? history.slice(0, latestAssistantIdx) : history;

  const showQuickReplies = mode === 'diary' && currentStep?.type === 'single' && currentStep.options;
  const showMultiSelect = mode === 'diary' && currentStep?.type === 'multi' && currentStep.options;
  const showTextInput = mode === 'free' || (mode === 'diary' && currentStep?.type === 'text');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex-shrink-0 pt-12 pb-3 px-4">
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <HamburgerButton onClick={() => setMenuOpen(true)} />
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <ProfileButton />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: showMultiSelect ? '280px' : showQuickReplies ? '240px' : '120px' }}>
        <div className="mx-auto max-w-md lg:max-w-2xl px-5 py-3 flex flex-col gap-3">
          {olderMessages.map((m) => (
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
          {latestAssistant && (
            <div key={latestAssistant.id} className="animate-fade-in py-6">
              <p className={`font-display ${fontClassFor(latestAssistant.text)} text-text whitespace-pre-wrap`}>
                {latestAssistant.text}
              </p>
            </div>
          )}
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

      <div className="fixed inset-x-0 z-30 pointer-events-none bottom-5 sm:bottom-6">
        <div className="mx-auto max-w-md lg:max-w-2xl px-4 pointer-events-auto space-y-2">
          {showQuickReplies && currentStep?.options && (
            <div className="flex flex-wrap gap-2 justify-end animate-fade-in">
              {currentStep.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleQuickReply(opt.value, opt.label)}
                  className="glass-strong rounded-full px-4 py-2.5 text-[14px] font-semibold text-text active:scale-95 transition-transform"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {showMultiSelect && currentStep?.options && (
            <div className="glass-strong rounded-3xl p-3 animate-fade-in">
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {currentStep.options.map((opt) => {
                  const selected = multiSelected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleMultiSelectToggle(opt.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                        selected ? 'bg-primary/10' : 'active:bg-white/40'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'gradient-primary border-transparent' : 'border-text-muted/40'
                      }`}>
                        {selected && <Check size={12} strokeWidth={3} className="text-white" />}
                      </span>
                      <span className="text-sm text-text">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleMultiSelectDone}
                className="w-full mt-2 gradient-primary text-white py-3 rounded-2xl font-bold shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all"
              >
                {multiSelected.length > 0 ? `Conferma (${multiSelected.length})` : 'Nessuna · Avanti'}
              </button>
            </div>
          )}
          {showTextInput && (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'diary' ? currentStep?.placeholder || 'Scrivi…' : 'Chiedi a Kinora…'}
                disabled={thinking}
                className="flex-1 glass-strong rounded-full px-5 py-3.5 text-[15px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={thinking || (mode === 'free' && !input.trim())}
                className="w-12 h-12 rounded-full gradient-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-primary/30 glow-primary"
                aria-label="Invia"
              >
                <Send size={18} />
              </button>
            </form>
          )}
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
