'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Loader2, Check } from 'lucide-react';
import SideMenu, { HamburgerButton } from '@/components/SideMenu';
import ProfileButton from '@/components/ProfileButton';
import Wordmark from '@/components/Wordmark';
import TypewriterTwoColor from '@/components/TypewriterTwoColor';
import { useAppStore } from '@/lib/store';
import {
  DiaryAnswer,
  DiaryStep,
  nextStep,
  buildDailyEntryFromAnswer,
} from '@/lib/diary-script';
import { saveDailyEntry, saveContractItem } from '@/lib/firestore';
import { TernaryResponse } from '@/lib/types';
import {
  ContractAnswer,
  ContractCommitment,
  nextCommitment,
  buildContractItems,
} from '@/lib/contract-script';
import { generateUpcomingAppointments, MockAppointment, findAppointmentTomorrow } from '@/lib/appointments-mock';
import CalendarWidget from '@/components/CalendarWidget';
import DiaryVisual, { VisualType } from '@/components/DiaryVisual';
import HomeWelcome from '@/components/HomeWelcome';

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
  widget?: { type: 'calendar'; appointments: MockAppointment[] };
}

function fontClassFor(text: string): string {
  const len = text.length;
  if (len < 30) return 'text-4xl sm:text-5xl leading-tight';
  if (len < 80) return 'text-3xl sm:text-4xl leading-tight';
  if (len < 160) return 'text-2xl sm:text-3xl leading-snug';
  if (len < 300) return 'text-xl sm:text-2xl leading-snug';
  if (len < 600) return 'text-lg sm:text-xl leading-relaxed';
  return 'text-base sm:text-lg leading-relaxed';
}

const PINK = '#E85A7A';
const VIOLET = '#322A6E';

function TwoColorInline({ text }: { text: string }) {
  if (!text) return null;
  return (
    <>
      <span style={{ color: PINK }}>{text.charAt(0)}</span>
      <span style={{ color: VIOLET }}>{text.slice(1)}</span>
    </>
  );
}

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, todayCompleted, getStreak, getComplianceRate, entries, videos, contractItems } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'free' | 'diary' | 'contract'>('free');
  const [diaryAnswer, setDiaryAnswer] = useState<DiaryAnswer>({});
  const [currentStep, setCurrentStep] = useState<DiaryStep | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [contractAnswer, setContractAnswer] = useState<ContractAnswer>({ accepted: [], rejected: [] });
  const [currentCommitment, setCurrentCommitment] = useState<ContractCommitment | null>(null);

  const name = user?.name?.split(' ')[0] || 'Mario';

  const buildContext = useCallback(() => {
    const sortedVideos = [...videos].sort((a, b) => b.date.localeCompare(a.date));
    let daysSinceLastVideo: number | undefined;
    if (sortedVideos.length > 0) {
      const last = new Date(sortedVideos[0].date);
      daysSinceLastVideo = Math.floor((Date.now() - last.getTime()) / 86400000);
    }
    const completed = entries
      .filter((e) => e.completedAt)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const recentNotes = completed
      .map((e) => e.notes)
      .filter((n): n is string => !!n && n.trim().length > 0)
      .slice(0, 3);
    const noticedCompensationsRecently = completed.slice(0, 5).some((e) => e.noticedCompensations);
    const lastEntry = completed[0];
    const today = new Date().toISOString().split('T')[0];
    const ternaryStr = (v?: TernaryResponse) => v === 'yes' ? 'sì' : v === 'partial' ? 'in parte' : v === 'no' ? 'no' : undefined;
    const recentDiary = completed.slice(0, 7).map((e) => ({
      date: e.date,
      mood: e.mood,
      didTherapy: e.didTherapy,
      therapyMinutes: e.therapyMinutes,
      feeling: e.feeling,
      practicedActions: ternaryStr(e.practicedActions),
      selectedActions: e.selectedActions,
      handInOtherActivities: ternaryStr(e.handInOtherActivities),
      posture: ternaryStr(e.posture),
      noticedCompensations: e.noticedCompensations,
      compensationTypes: e.compensationTypes,
      notes: e.notes,
    }));
    const contract = contractItems.map((ci) => ({
      text: ci.text,
      type: ci.type,
      isActive: ci.isActive,
    }));
    const upcomingAppointments = generateUpcomingAppointments().slice(0, 6).map((a) => ({
      date: a.date.toISOString().split('T')[0],
      time: a.time,
      title: a.title,
      who: a.who,
    }));
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
      recentDiary,
      contract,
      upcomingAppointments,
    };
  }, [user, todayCompleted, getStreak, getComplianceRate, entries, videos, name, contractItems]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();

    // We want the latest USER bubble's bottom to sit ~80px from the top of the
    // visible scroll area, so the bot's response starts comfortably under it
    // (not pinned to the very edge). Use getBoundingClientRect so it works
    // regardless of CSS positioning of intermediate ancestors.
    let lastUserIdx = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') { lastUserIdx = i; break; }
    }

    const tailVisible = 96; // visible portion of the user's tail at the top

    if (lastUserIdx >= 0) {
      const el = document.getElementById(`msg-${history[lastUserIdx].id}`);
      if (el) {
        const elRect = el.getBoundingClientRect();
        const deltaToTop = elRect.bottom - containerRect.top - tailVisible;
        container.scrollTo({ top: Math.max(0, container.scrollTop + deltaToTop), behavior: 'smooth' });
        return;
      }
    }

    const lastBotIdx = (() => {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'assistant') return i;
      }
      return -1;
    })();
    if (lastBotIdx < 0) return;
    const botEl = document.getElementById(`msg-${history[lastBotIdx].id}`);
    if (botEl) {
      const elRect = botEl.getBoundingClientRect();
      const deltaToTop = elRect.top - containerRect.top - 24;
      container.scrollTo({ top: Math.max(0, container.scrollTop + deltaToTop), behavior: 'smooth' });
    }
  }, [history, currentStep]);

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
      setMode('free');
      setCurrentStep(null);
      setHistory([{
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Hai già compilato il diario di oggi. Se ti va possiamo chiacchierare, oppure ci sentiamo domani.`,
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
    const userText = Array.isArray(value) ? value.join(', ') : displayLabel || value;
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

  function startContract() {
    const empty: ContractAnswer = { accepted: [], rejected: [] };
    setContractAnswer(empty);
    setMode('contract');
    const first = nextCommitment(empty);
    if (first) {
      setCurrentCommitment(first);
      setHistory([
        {
          id: `intro-${Date.now()}`,
          role: 'assistant',
          text: 'Mettiamo a punto il tuo contratto riabilitativo. Ti farò una serie di domande sugli impegni che vorrai prenderti. Rispondi sì o no a ogni domanda.',
        },
        { id: `a-${Date.now()}`, role: 'assistant', text: first.question },
      ]);
    }
  }

  async function advanceContract(accepted: boolean) {
    if (!currentCommitment) return;
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: accepted ? 'Sì' : 'No',
    };
    setHistory((h) => [...h, userMsg]);

    const updated: ContractAnswer = {
      accepted: accepted ? [...contractAnswer.accepted, currentCommitment.id] : contractAnswer.accepted,
      rejected: !accepted ? [...contractAnswer.rejected, currentCommitment.id] : contractAnswer.rejected,
    };
    setContractAnswer(updated);

    setTimeout(async () => {
      const next = nextCommitment(updated);
      if (next) {
        setCurrentCommitment(next);
        setHistory((h) => [...h, { id: `a-${Date.now()}`, role: 'assistant', text: next.question }]);
      } else {
        setCurrentCommitment(null);
        await finishContract(updated);
      }
    }, 350);
  }

  async function finishContract(answer: ContractAnswer) {
    const accCount = answer.accepted.length;
    const closing: ChatMsg = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: accCount === 0
        ? 'Hai scelto di non prenderti nessun impegno per ora. Possiamo rifarlo quando vuoi.'
        : `Perfetto, hai preso ${accCount} ${accCount === 1 ? 'impegno' : 'impegni'}. Il tuo contratto è attivo da oggi. Ci sentiamo domani per il primo diario.`,
    };
    setHistory((h) => [...h, closing]);

    const patientId = user?.id || 'patient-1';
    const items = buildContractItems(patientId, answer);
    const store = useAppStore.getState();
    for (const item of items) {
      store.addContractItem(item);
      if (user && !user.isDemo) {
        try { await saveContractItem(item); } catch {}
      }
    }

    setMode('free');
    setCurrentCommitment(null);
  }

  async function finishDiary(answer: DiaryAnswer) {
    const apptTomorrow = findAppointmentTomorrow(generateUpcomingAppointments());
    const baseText = 'Grazie, ho salvato il diario. Se ti va possiamo continuare a parlare di qualsiasi cosa.';
    const closingText = apptTomorrow
      ? `${baseText}\n\nQuasi dimenticavo: domani hai "${apptTomorrow.title}" alle ${apptTomorrow.time} con ${apptTomorrow.who}. Ti ci faccio trovare pronto.`
      : baseText;
    const closing: ChatMsg = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: closingText,
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

    setMode('free');
    setCurrentStep(null);
  }

  const urlMode = searchParams.get('mode');
  const urlPrompt = searchParams.get('prompt');
  const urlNew = searchParams.get('new');

  useEffect(() => {
    if (!mounted) return;
    if (urlNew === '1') {
      setHistory([]);
      setInput('');
      setMode('free');
      setCurrentStep(null);
      setDiaryAnswer({});
      setCurrentCommitment(null);
      setContractAnswer({ accepted: [], rejected: [] });
      router.replace('/');
      return;
    }
    if (urlMode === 'diary') {
      startDiary();
      router.replace('/');
      return;
    }
    if (urlMode === 'contract') {
      startContract();
      router.replace('/');
      return;
    }
    if (urlPrompt === 'appointments') {
      const userMsg: ChatMsg = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: 'Quali sono i miei prossimi appuntamenti?',
      };
      const appts = generateUpcomingAppointments();
      const botMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Ecco il tuo calendario. In viola gli appuntamenti col fisioterapista, in rosa i laboratori di gruppo, in azzurro il counselor.`,
        widget: { type: 'calendar', appointments: appts },
      };
      setHistory((h) => [...h, userMsg, botMsg]);
      setMode('free');
      setCurrentStep(null);
      setCurrentCommitment(null);
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
  }, [mounted, urlMode, urlPrompt, urlNew]);

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
    setCurrentCommitment(null);
    setContractAnswer({ accepted: [], rejected: [] });
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

  const latestBotIdx = (() => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') return i;
    }
    return -1;
  })();

  const showQuickReplies = (mode === 'diary' && currentStep?.type === 'single' && currentStep.options) || (mode === 'contract' && currentCommitment);
  const showMultiSelect = mode === 'diary' && currentStep?.type === 'multi' && currentStep.options;
  const showTextInput = mode === 'free' || (mode === 'diary' && currentStep?.type === 'text');

  const quickReplyOptions: { label: string; value: string }[] | undefined =
    mode === 'diary' ? currentStep?.options :
    mode === 'contract' && currentCommitment ? [
      { label: 'Sì', value: 'yes' },
      { label: 'No', value: 'no' },
    ] : undefined;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 pt-12 pb-3 px-4 z-20 relative backdrop-blur-md bg-white/40 border-b border-white/40">
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <HamburgerButton onClick={() => setMenuOpen(true)} />
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <ProfileButton />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0" style={{ paddingBottom: showMultiSelect ? '280px' : showQuickReplies ? '200px' : '110px' }}>
        <div className="mx-auto max-w-md lg:max-w-2xl px-5 py-3 flex flex-col gap-3">
          {history.length === 0 && mode === 'free' && (
            <HomeWelcome name={name} todayCompleted={todayCompleted()} />
          )}
          {history.map((m, idx) => {
            const isLatestBot = idx === latestBotIdx;
            if (isLatestBot) {
              return (
                <div key={m.id} id={`msg-${m.id}`} className="py-4 animate-fade-in min-h-[40vh]">
                  <TypewriterTwoColor
                    key={m.id}
                    text={m.text}
                    className={`font-display font-bold ${fontClassFor(m.text)} whitespace-pre-wrap block`}
                  />
                  {mode === 'diary' && currentStep?.visual && (
                    <div className="mt-5 animate-fade-in flex justify-start" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                      <DiaryVisual type={currentStep.visual as VisualType} />
                    </div>
                  )}
                  {m.widget?.type === 'calendar' && (
                    <CalendarWidget appointments={m.widget.appointments} />
                  )}
                </div>
              );
            }
            return (
              <div key={m.id} id={`msg-${m.id}`} className={`${m.role === 'user' ? 'flex justify-end' : ''} animate-fade-in`}>
                {m.role === 'user' ? (
                  <div className="max-w-[88%] rounded-3xl rounded-br-md px-4 py-2.5 gradient-primary text-white shadow-md shadow-primary/30">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                ) : (
                  <div>
                    <div className="glass rounded-3xl rounded-bl-md px-4 py-2.5 max-w-[88%]">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        <TwoColorInline text={m.text} />
                      </p>
                    </div>
                    {m.widget?.type === 'calendar' && (
                      <CalendarWidget appointments={m.widget.appointments} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          {showQuickReplies && quickReplyOptions && (
            <div className="flex flex-wrap gap-2 justify-end animate-fade-in">
              {quickReplyOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (mode === 'contract') {
                      advanceContract(opt.value === 'yes');
                    } else {
                      handleQuickReply(opt.value, opt.label);
                    }
                  }}
                  className="glass-strong rounded-full px-4 py-2.5 text-[14px] font-semibold text-text active:scale-95 transition-transform"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {showMultiSelect && currentStep?.options && (
            <div className="glass-strong rounded-3xl p-3 animate-fade-in">
              <div className="space-y-1 max-h-[36vh] overflow-y-auto">
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
