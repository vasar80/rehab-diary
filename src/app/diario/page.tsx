'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  PartyPopper,
  X,
  RotateCcw,
  ChevronRight,
  Hand,
  Activity,
  ListChecks,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { TernaryResponse } from '@/lib/types';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Pessimo' },
  { value: 2, emoji: '😔', label: 'Male' },
  { value: 3, emoji: '😐', label: 'Così così' },
  { value: 4, emoji: '🙂', label: 'Bene' },
  { value: 5, emoji: '😊', label: 'Benissimo' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 ora' },
  { value: 90, label: '1h 30' },
  { value: 120, label: '2 ore' },
];

const FEELING_LABELS = ['', 'Molto faticosa', 'Faticosa', 'Nella norma', 'Buona', 'Eccellente'];

const MAL_ACTIONS = [
  'Aprire una porta con la maniglia',
  'Bere da un bicchiere o tazza',
  'Mangiare con forchetta o cucchiaio',
  'Lavarsi i denti',
  'Lavarsi le mani',
  'Pettinarsi',
  'Indossare o togliere i calzini',
  'Aprire un cassetto',
  'Usare il telecomando della TV',
  'Scrivere su un foglio',
];

const COMPENSATION_TYPES = [
  'La spalla si sollevava',
  'Il tronco si inclinava',
  'La schiena si muoveva troppo',
  'La mano si poneva rigida',
  'Il polso si chiudeva',
  'Il gomito si fletteva',
];

type ScreenId =
  | 'mood'
  | 'therapy'
  | 'therapy-reason'
  | 'duration'
  | 'feeling'
  | 'actions'
  | 'actions-list'
  | 'actions-reason'
  | 'hand'
  | 'hand-reason'
  | 'posture'
  | 'compensations'
  | 'compensation-types';

function computeScreens(draft: {
  didTherapy?: boolean;
  practicedActions?: TernaryResponse;
  handInOtherActivities?: TernaryResponse;
  noticedCompensations?: boolean;
}): ScreenId[] {
  const screens: ScreenId[] = ['mood', 'therapy'];
  if (draft.didTherapy === false) {
    screens.push('therapy-reason');
  } else if (draft.didTherapy === true) {
    screens.push('duration', 'feeling', 'actions');
    if (draft.practicedActions === 'no') {
      screens.push('actions-reason');
    } else if (draft.practicedActions === 'yes' || draft.practicedActions === 'partial') {
      screens.push('actions-list');
    }
    screens.push('hand');
    if (draft.handInOtherActivities === 'no') screens.push('hand-reason');
    screens.push('posture');
  }
  screens.push('compensations');
  if (draft.noticedCompensations === true) screens.push('compensation-types');
  return screens;
}

export default function DiarioPage() {
  const router = useRouter();
  const {
    user,
    diaryDraft,
    updateDiaryDraft,
    resetDiaryDraft,
    submitDiary,
    todayCompleted,
    resetTodayEntry,
  } = useAppStore();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setMounted(true);
    resetDiaryDraft();
  }, [resetDiaryDraft]);

  const isF = user?.sex === 'F';
  const past = (masc: string, fem: string) => (isF ? fem : masc);

  const screens = useMemo(
    () => computeScreens(diaryDraft),
    [diaryDraft.didTherapy, diaryDraft.practicedActions, diaryDraft.handInOtherActivities, diaryDraft.noticedCompensations] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const currentScreen: ScreenId = screens[Math.min(step, screens.length - 1)];
  const totalSteps = screens.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, screens.length - 1));
  }, [screens.length]);

  const goBack = useCallback(() => {
    if (step === 0) {
      router.push('/');
      return;
    }
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, [step, router]);

  function handleSubmit() {
    submitDiary();
    setSubmitted(true);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (todayCompleted() && !submitted) {
    const handleReset = async () => {
      setResetting(true);
      await resetTodayEntry();
      setStep(0);
      setDirection(1);
      setResetting(false);
    };
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-5 pt-14 pb-4">
          <div className="mx-auto max-w-md flex items-center">
            <button onClick={() => router.push('/')} className="glass w-10 h-10 rounded-2xl flex items-center justify-center">
              <ArrowLeft size={20} className="text-text" />
            </button>
            <h1 className="text-lg font-bold text-text ml-3">Diario</h1>
          </div>
        </header>
        <div className="px-5 mx-auto max-w-md flex flex-col items-center justify-center mt-16 animate-scale-in">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-50" />
            <div className="relative w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center shadow-2xl glow-primary">
              <Check size={36} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-text mt-6">Già completato!</h2>
          <p className="text-text-secondary text-center mt-2">
            Hai già compilato il diario per oggi.
          </p>
          <div className="w-full space-y-2.5 mt-8">
            <button onClick={() => router.push('/')} className="w-full gradient-primary text-white px-8 py-3.5 rounded-2xl font-semibold shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all">
              Torna alla home
            </button>
            <button onClick={handleReset} disabled={resetting} className="w-full glass text-text px-8 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
              <RotateCcw size={16} className={resetting ? 'animate-spin' : ''} />
              {resetting ? 'Reset in corso…' : 'Rifai diario di oggi'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="blob-bg blob-teal w-[400px] h-[400px] top-[20%] left-[10%] animate-float-blob-1" />
          <div className="blob-bg blob-warm w-[300px] h-[300px] top-[50%] right-[10%] animate-float-blob-2" />
          <div className="blob-bg blob-pink w-[250px] h-[250px] bottom-[10%] left-[40%] animate-float-blob-1" style={{ animationDelay: '3s' }} />
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="text-center"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 gradient-warm rounded-3xl blur-3xl opacity-60 scale-150" />
            <div className="relative w-24 h-24 gradient-warm rounded-3xl flex items-center justify-center shadow-2xl glow-warm mx-auto animate-float">
              <PartyPopper size={42} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-text mt-8">Fantastico!</h2>
          <p className="text-text-secondary mt-3 max-w-[280px] mx-auto leading-relaxed">
            Hai completato il diario di oggi.<br/>Ogni giorno è un passo avanti!
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-8 gradient-primary text-white px-10 py-4 rounded-2xl font-semibold shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all"
          >
            Torna alla home
          </button>
        </motion.div>
      </div>
    );
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
  };

  function renderScreen() {
    switch (currentScreen) {
      case 'mood':
        return (
          <StepContainer title="Come ti senti oggi?" subtitle="Seleziona il tuo umore">
            <div className="flex justify-between gap-2 mt-8">
              {MOOD_OPTIONS.map((opt) => {
                const selected = diaryDraft.mood === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { updateDiaryDraft({ mood: opt.value }); setTimeout(goNext, 280); }}
                    className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl flex-1 transition-all ${
                      selected ? 'gradient-primary shadow-lg shadow-primary/40 glow-primary scale-110' : 'glass active:scale-95'
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className={`text-[10px] font-semibold ${selected ? 'text-white' : 'text-text-secondary'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </StepContainer>
        );

      case 'therapy':
        return (
          <StepContainer title="Hai fatto terapia ieri?" subtitle="Seleziona una risposta">
            <div className="space-y-3 mt-8">
              <OptionButton
                selected={diaryDraft.didTherapy === true}
                onClick={() => { updateDiaryDraft({ didTherapy: true }); setTimeout(goNext, 280); }}
                icon={<Check size={20} strokeWidth={3} />}
                label="Sì, ho fatto terapia"
                gradient="gradient-primary"
              />
              <OptionButton
                selected={diaryDraft.didTherapy === false}
                onClick={() => { updateDiaryDraft({ didTherapy: false }); setTimeout(goNext, 280); }}
                icon={<X size={20} strokeWidth={3} />}
                label="No, non ho fatto terapia"
                gradient="gradient-warm"
              />
            </div>
          </StepContainer>
        );

      case 'therapy-reason':
        return (
          <StepContainer
            title={`Perché non sei ${past('riuscito', 'riuscita')} a fare terapia?`}
            subtitle="Raccontaci cosa è successo (opzionale)"
          >
            <textarea
              value={diaryDraft.noTherapyReason || ''}
              onChange={(e) => updateDiaryDraft({ noTherapyReason: e.target.value })}
              placeholder="Es. mi sentivo stanco, avevo altri impegni, dolore eccessivo…"
              className="w-full mt-6 glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none h-32 focus:outline-none focus:border-primary transition-all"
            />
            <button onClick={goNext} className="w-full mt-4 gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all">
              Avanti <ChevronRight size={18} />
            </button>
          </StepContainer>
        );

      case 'duration':
        return (
          <StepContainer title="Per quanto tempo?" subtitle="Durata della sessione" icon={<Clock size={24} className="text-primary" />}>
            <div className="grid grid-cols-2 gap-3 mt-8">
              {DURATION_OPTIONS.map((opt) => {
                const selected = diaryDraft.therapyMinutes === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { updateDiaryDraft({ therapyMinutes: opt.value }); setTimeout(goNext, 280); }}
                    className={`py-4 px-4 rounded-2xl text-center font-bold transition-all ${
                      selected ? 'gradient-primary text-white shadow-lg shadow-primary/40 glow-primary scale-105' : 'glass text-text active:scale-95'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </StepContainer>
        );

      case 'feeling':
        return (
          <StepContainer title="Come è andata la sessione?" subtitle="Valuta la tua esperienza">
            <div className="space-y-2.5 mt-8">
              {[5, 4, 3, 2, 1].map((val) => {
                const selected = diaryDraft.feeling === val;
                return (
                  <button
                    key={val}
                    onClick={() => { updateDiaryDraft({ feeling: val }); setTimeout(goNext, 280); }}
                    className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 transition-all ${
                      selected ? 'gradient-primary text-white shadow-lg shadow-primary/30 glow-primary' : 'glass text-text active:scale-[0.98]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${selected ? 'bg-white/25' : 'bg-primary/10'}`}>
                      <span className={selected ? 'text-white' : 'text-primary'}>{val}</span>
                    </div>
                    <span className="font-semibold">{FEELING_LABELS[val]}</span>
                  </button>
                );
              })}
            </div>
          </StepContainer>
        );

      case 'actions':
        return (
          <StepContainer
            title={`Sei ${past('riuscito', 'riuscita')} a esercitarti con le azioni concordate?`}
            subtitle="Le azioni che hai scelto con il tuo terapista"
            icon={<Activity size={24} className="text-primary" />}
          >
            <div className="space-y-2.5 mt-8">
              <OptionButton
                selected={diaryDraft.practicedActions === 'yes'}
                onClick={() => { updateDiaryDraft({ practicedActions: 'yes' }); setTimeout(goNext, 280); }}
                icon={<Check size={20} strokeWidth={3} />}
                label="Sì"
                gradient="gradient-primary"
              />
              <OptionButton
                selected={diaryDraft.practicedActions === 'partial'}
                onClick={() => { updateDiaryDraft({ practicedActions: 'partial' }); setTimeout(goNext, 280); }}
                icon={<span className="text-base font-bold">~</span>}
                label="In parte"
                gradient="gradient-warm"
              />
              <OptionButton
                selected={diaryDraft.practicedActions === 'no'}
                onClick={() => { updateDiaryDraft({ practicedActions: 'no' }); setTimeout(goNext, 280); }}
                icon={<X size={20} strokeWidth={3} />}
                label="No"
                gradient="gradient-sunset"
              />
            </div>
          </StepContainer>
        );

      case 'actions-list': {
        const selected = diaryDraft.selectedActions || [];
        const toggle = (action: string) => {
          const next = selected.includes(action)
            ? selected.filter((a) => a !== action)
            : [...selected, action];
          updateDiaryDraft({ selectedActions: next });
        };
        return (
          <StepContainer
            title="Quali azioni hai svolto?"
            subtitle={`Seleziona tutte le azioni che sei ${past('riuscito', 'riuscita')} a fare`}
            icon={<ListChecks size={24} className="text-primary" />}
          >
            <div className="space-y-2 mt-6">
              {MAL_ACTIONS.map((action) => {
                const isSel = selected.includes(action);
                return (
                  <button
                    key={action}
                    onClick={() => toggle(action)}
                    className={`w-full py-3 px-3.5 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-[0.98] ${
                      isSel ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'glass text-text'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isSel ? 'bg-white/30' : 'bg-primary/10 border border-primary/30'
                    }`}>
                      {isSel && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium leading-snug">{action}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={goNext} className="w-full mt-5 gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all">
              Avanti <ChevronRight size={18} />
            </button>
          </StepContainer>
        );
      }

      case 'actions-reason':
        return (
          <StepContainer
            title="Perché non hai potuto esercitarti?"
            subtitle="Raccontaci cosa è successo (opzionale)"
          >
            <textarea
              value={diaryDraft.noPracticedActionsReason || ''}
              onChange={(e) => updateDiaryDraft({ noPracticedActionsReason: e.target.value })}
              placeholder="Es. mi sentivo stanco, dolore, mancanza di tempo…"
              className="w-full mt-6 glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none h-32 focus:outline-none focus:border-primary transition-all"
            />
            <button onClick={goNext} className="w-full mt-4 gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all">
              Avanti <ChevronRight size={18} />
            </button>
          </StepContainer>
        );

      case 'hand':
        return (
          <StepContainer
            title={`Hai ${past('usato', 'usata')} la mano in altre attività?`}
            subtitle="Es. mentre mangi, guardi la TV, durante la giornata"
            icon={<Hand size={24} className="text-primary" />}
          >
            <div className="space-y-2.5 mt-8">
              <OptionButton
                selected={diaryDraft.handInOtherActivities === 'yes'}
                onClick={() => { updateDiaryDraft({ handInOtherActivities: 'yes' }); setTimeout(goNext, 280); }}
                icon={<Check size={20} strokeWidth={3} />}
                label="Sì"
                gradient="gradient-primary"
              />
              <OptionButton
                selected={diaryDraft.handInOtherActivities === 'partial'}
                onClick={() => { updateDiaryDraft({ handInOtherActivities: 'partial' }); setTimeout(goNext, 280); }}
                icon={<span className="text-base font-bold">~</span>}
                label="In parte"
                gradient="gradient-warm"
              />
              <OptionButton
                selected={diaryDraft.handInOtherActivities === 'no'}
                onClick={() => { updateDiaryDraft({ handInOtherActivities: 'no' }); setTimeout(goNext, 280); }}
                icon={<X size={20} strokeWidth={3} />}
                label="No"
                gradient="gradient-sunset"
              />
            </div>
          </StepContainer>
        );

      case 'hand-reason':
        return (
          <StepContainer
            title="Perché no?"
            subtitle="Cosa ti ha impedito di usarla? (opzionale)"
          >
            <textarea
              value={diaryDraft.noHandReason || ''}
              onChange={(e) => updateDiaryDraft({ noHandReason: e.target.value })}
              placeholder="Es. dolore, paura di sbagliare, abitudine, stanchezza…"
              className="w-full mt-6 glass-strong border border-white/80 rounded-2xl p-4 text-sm text-text resize-none h-32 focus:outline-none focus:border-primary transition-all"
            />
            <button onClick={goNext} className="w-full mt-4 gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all">
              Avanti <ChevronRight size={18} />
            </button>
          </StepContainer>
        );

      case 'posture':
        return (
          <StepContainer
            title="Hai fatto attenzione alla postura?"
            subtitle="Stare seduto/a simmetrico, senza appoggiare lo schienale"
          >
            <div className="space-y-2.5 mt-8">
              <OptionButton
                selected={diaryDraft.posture === 'yes'}
                onClick={() => { updateDiaryDraft({ posture: 'yes' }); setTimeout(goNext, 280); }}
                icon={<Check size={20} strokeWidth={3} />}
                label="Sì"
                gradient="gradient-primary"
              />
              <OptionButton
                selected={diaryDraft.posture === 'partial'}
                onClick={() => { updateDiaryDraft({ posture: 'partial' }); setTimeout(goNext, 280); }}
                icon={<span className="text-base font-bold">~</span>}
                label="In parte"
                gradient="gradient-warm"
              />
              <OptionButton
                selected={diaryDraft.posture === 'no'}
                onClick={() => { updateDiaryDraft({ posture: 'no' }); setTimeout(goNext, 280); }}
                icon={<X size={20} strokeWidth={3} />}
                label="No"
                gradient="gradient-sunset"
              />
            </div>
          </StepContainer>
        );

      case 'compensations':
        return (
          <StepContainer
            title="Hai notato compensi durante i movimenti?"
            subtitle="Movimenti involontari che hai osservato"
            icon={<AlertTriangle size={24} className="text-warning" />}
          >
            <div className="space-y-2.5 mt-8">
              <OptionButton
                selected={diaryDraft.noticedCompensations === true}
                onClick={() => { updateDiaryDraft({ noticedCompensations: true }); setTimeout(goNext, 280); }}
                icon={<Check size={20} strokeWidth={3} />}
                label="Sì"
                gradient="gradient-warm"
              />
              <OptionButton
                selected={diaryDraft.noticedCompensations === false}
                onClick={() => {
                  updateDiaryDraft({ noticedCompensations: false });
                  setTimeout(handleSubmit, 280);
                }}
                icon={<X size={20} strokeWidth={3} />}
                label="No"
                gradient="gradient-primary"
              />
            </div>
            <p className="mt-6 text-center text-xs text-text-secondary">
              {diaryDraft.noticedCompensations !== true && 'Rispondendo "No" il diario viene salvato'}
            </p>
          </StepContainer>
        );

      case 'compensation-types': {
        const selected = diaryDraft.compensationTypes || [];
        const toggle = (t: string) => {
          const next = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t];
          updateDiaryDraft({ compensationTypes: next });
        };
        return (
          <StepContainer
            title="Quali compensi hai notato?"
            subtitle="Seleziona tutti i movimenti involontari osservati"
            icon={<AlertTriangle size={24} className="text-warning" />}
          >
            <div className="space-y-2 mt-6">
              {COMPENSATION_TYPES.map((t) => {
                const isSel = selected.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggle(t)}
                    className={`w-full py-3 px-3.5 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-[0.98] ${
                      isSel ? 'gradient-warm text-white shadow-md shadow-accent/30' : 'glass text-text'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isSel ? 'bg-white/30' : 'bg-accent/10 border border-accent/30'
                    }`}>
                      {isSel && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium leading-snug">{t}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleSubmit}
              className="w-full mt-5 gradient-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all"
            >
              Salva e completa
            </button>
          </StepContainer>
        );
      }
    }
  }

  return (
    <div className="min-h-screen relative">
      <header className="px-5 pt-14 pb-2 sticky top-0 z-20">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="glass w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
              <ArrowLeft size={20} className="text-text" />
            </button>
            <span className="text-sm font-bold text-text-secondary glass rounded-full px-3 py-1">
              {step + 1} / {totalSteps}
            </span>
          </div>
          <div className="mt-3 h-1.5 bg-white/40 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full gradient-primary rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md mt-4 pb-32">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function StepContainer({
  title,
  subtitle,
  icon,
  tag,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4">
      {tag && (
        <span className="inline-block gradient-primary text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
          {tag}
        </span>
      )}
      {icon && (
        <div className="mb-3 w-12 h-12 rounded-2xl glass-tinted-primary flex items-center justify-center">
          {icon}
        </div>
      )}
      <h2 className="text-2xl font-bold text-text leading-tight tracking-tight">{title}</h2>
      <p className="text-sm text-text-secondary mt-1.5">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  icon,
  label,
  gradient,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  gradient: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 px-4 rounded-2xl flex items-center gap-3 font-semibold transition-all active:scale-[0.98] ${
        selected ? `${gradient} text-white shadow-lg shadow-primary/30 glow-primary` : 'glass text-text'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-white/25' : gradient}`}>
        <span className="text-white">{icon}</span>
      </div>
      {label}
    </button>
  );
}
