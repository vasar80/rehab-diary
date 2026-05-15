'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  MessageSquare,
  PartyPopper,
  X,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ContractResponse } from '@/lib/types';

const moodOptions = [
  { value: 1, emoji: '😫', label: 'Pessimo' },
  { value: 2, emoji: '😔', label: 'Male' },
  { value: 3, emoji: '😐', label: 'Così così' },
  { value: 4, emoji: '🙂', label: 'Bene' },
  { value: 5, emoji: '😊', label: 'Benissimo' },
];

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 ora' },
  { value: 90, label: '1h 30' },
  { value: 120, label: '2 ore' },
];

const feelingLabels = ['', 'Molto faticosa', 'Faticosa', 'Nella norma', 'Buona', 'Eccellente'];

export default function DiarioPage() {
  const router = useRouter();
  const {
    diaryDraft,
    updateDiaryDraft,
    resetDiaryDraft,
    submitDiary,
    contractItems,
    todayCompleted,
    resetTodayEntry,
  } = useAppStore();
  const [resetting, setResetting] = useState(false);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeItems = contractItems.filter((ci) => ci.isActive && ci.type === 'specific');
  const totalSteps = 4 + activeItems.length + 1;

  useEffect(() => {
    setMounted(true);
    resetDiaryDraft();
  }, [resetDiaryDraft]);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    if (step === 0) {
      router.push('/');
      return;
    }
    setDirection(-1);
    if (step === 2 && !diaryDraft.didTherapy) {
      setStep(0);
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  }, [step, router, diaryDraft.didTherapy]);

  function handleMood(value: number) {
    updateDiaryDraft({ mood: value });
    setTimeout(goNext, 300);
  }

  function handleTherapy(did: boolean) {
    updateDiaryDraft({ didTherapy: did });
    if (did) {
      setTimeout(goNext, 300);
    } else {
      setDirection(1);
      setTimeout(() => setStep(3), 300);
    }
  }

  function handleDuration(minutes: number) {
    updateDiaryDraft({ therapyMinutes: minutes });
    setTimeout(goNext, 300);
  }

  function handleFeeling(value: number) {
    updateDiaryDraft({ feeling: value });
    setTimeout(goNext, 300);
  }

  function handleContractResponse(contractItemId: string, response: 'yes' | 'no' | 'partial') {
    const existing = diaryDraft.contractResponses.filter((r) => r.contractItemId !== contractItemId);
    const updated: ContractResponse[] = [...existing, { contractItemId, response }];
    updateDiaryDraft({ contractResponses: updated });
    setTimeout(goNext, 300);
  }

  function handleCompensations(noticed: boolean) {
    updateDiaryDraft({ noticedCompensations: noticed });
  }

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
            <button
              onClick={() => router.push('/')}
              className="w-full gradient-primary text-white px-8 py-3.5 rounded-2xl font-semibold shadow-lg shadow-primary/30 glow-primary active:scale-[0.98] transition-all"
            >
              Torna alla home
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full glass text-text px-8 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
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

  const progress = ((step + 1) / totalSteps) * 100;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
  };

  function renderStep() {
    if (step === 0) {
      return (
        <StepContainer title="Come ti senti oggi?" subtitle="Seleziona il tuo umore">
          <div className="flex justify-between gap-2 mt-8">
            {moodOptions.map((opt) => {
              const selected = diaryDraft.mood === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleMood(opt.value)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl flex-1 transition-all ${
                    selected
                      ? 'gradient-primary shadow-lg shadow-primary/40 glow-primary scale-110'
                      : 'glass active:scale-95'
                  }`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className={`text-[10px] font-semibold ${selected ? 'text-white' : 'text-text-secondary'}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </StepContainer>
      );
    }

    if (step === 1) {
      return (
        <StepContainer title="Hai fatto terapia ieri?" subtitle="Seleziona una risposta">
          <div className="space-y-3 mt-8">
            <OptionButton
              selected={diaryDraft.didTherapy === true}
              onClick={() => handleTherapy(true)}
              icon={<Check size={20} strokeWidth={3} />}
              label="Sì, ho fatto terapia"
              gradient="gradient-primary"
            />
            <OptionButton
              selected={diaryDraft.didTherapy === false}
              onClick={() => handleTherapy(false)}
              icon={<X size={20} strokeWidth={3} />}
              label="No, non ho fatto terapia"
              gradient="gradient-warm"
            />
          </div>
        </StepContainer>
      );
    }

    if (step === 2) {
      return (
        <StepContainer
          title="Per quanto tempo?"
          subtitle="Durata della sessione"
          icon={<Clock size={24} className="text-primary" />}
        >
          <div className="grid grid-cols-2 gap-3 mt-8">
            {durationOptions.map((opt) => {
              const selected = diaryDraft.therapyMinutes === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleDuration(opt.value)}
                  className={`py-4 px-4 rounded-2xl text-center font-bold transition-all ${
                    selected
                      ? 'gradient-primary text-white shadow-lg shadow-primary/40 glow-primary scale-105'
                      : 'glass text-text active:scale-95'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </StepContainer>
      );
    }

    if (step === 3) {
      return (
        <StepContainer title="Come è andata la sessione?" subtitle="Valuta la tua esperienza">
          <div className="space-y-2.5 mt-8">
            {[5, 4, 3, 2, 1].map((val) => {
              const selected = diaryDraft.feeling === val;
              return (
                <button
                  key={val}
                  onClick={() => handleFeeling(val)}
                  className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 transition-all ${
                    selected
                      ? 'gradient-primary text-white shadow-lg shadow-primary/30 glow-primary'
                      : 'glass text-text active:scale-[0.98]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                    selected ? 'bg-white/25' : 'bg-primary/10'
                  }`}>
                    <span className={selected ? 'text-white' : 'text-primary'}>
                      {val}
                    </span>
                  </div>
                  <span className="font-semibold">{feelingLabels[val]}</span>
                </button>
              );
            })}
          </div>
        </StepContainer>
      );
    }

    const contractStepIndex = step - 4;
    if (contractStepIndex >= 0 && contractStepIndex < activeItems.length) {
      const item = activeItems[contractStepIndex];
      const currentResponse = diaryDraft.contractResponses.find(
        (r) => r.contractItemId === item.id
      );
      return (
        <StepContainer
          title={item.text}
          subtitle="Hai rispettato questo impegno oggi?"
          tag="Contratto"
        >
          <div className="space-y-2.5 mt-8">
            <OptionButton
              selected={currentResponse?.response === 'yes'}
              onClick={() => handleContractResponse(item.id, 'yes')}
              icon={<Check size={20} strokeWidth={3} />}
              label="Sì"
              gradient="gradient-primary"
            />
            <OptionButton
              selected={currentResponse?.response === 'partial'}
              onClick={() => handleContractResponse(item.id, 'partial')}
              icon={<span className="text-base font-bold">~</span>}
              label="In parte"
              gradient="gradient-warm"
            />
            <OptionButton
              selected={currentResponse?.response === 'no'}
              onClick={() => handleContractResponse(item.id, 'no')}
              icon={<X size={20} strokeWidth={3} />}
              label="No"
              gradient="gradient-sunset"
            />
          </div>
        </StepContainer>
      );
    }

    return (
      <StepContainer title="Ultime domande" subtitle="Quasi finito!">
        <div className="space-y-5 mt-6">
          <div className="glass rounded-3xl p-4">
            <label className="text-sm font-bold text-text flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg gradient-warm flex items-center justify-center">
                <AlertTriangle size={14} className="text-white" strokeWidth={2.5} />
              </div>
              Hai notato compensi?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => handleCompensations(true)}
                className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                  diaryDraft.noticedCompensations === true
                    ? 'gradient-warm text-white shadow-lg shadow-accent/30'
                    : 'bg-white/60 text-text active:scale-95'
                }`}
              >
                Sì
              </button>
              <button
                onClick={() => handleCompensations(false)}
                className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                  diaryDraft.noticedCompensations === false
                    ? 'gradient-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white/60 text-text active:scale-95'
                }`}
              >
                No
              </button>
            </div>
            {diaryDraft.noticedCompensations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 overflow-hidden"
              >
                <textarea
                  value={diaryDraft.compensationNotes || ''}
                  onChange={(e) => updateDiaryDraft({ compensationNotes: e.target.value })}
                  placeholder="Descrivi i compensi che hai notato..."
                  className="w-full bg-white/70 border border-white/80 rounded-2xl p-3 text-sm text-text resize-none h-24 focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </motion.div>
            )}
          </div>

          <div className="glass rounded-3xl p-4">
            <label className="text-sm font-bold text-text flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <MessageSquare size={14} className="text-white" strokeWidth={2.5} />
              </div>
              Note aggiuntive
            </label>
            <textarea
              value={diaryDraft.notes || ''}
              onChange={(e) => updateDiaryDraft({ notes: e.target.value })}
              placeholder="Come è andata la giornata? Qualcosa da segnalare?"
              className="w-full bg-white/70 border border-white/80 rounded-2xl p-3 text-sm text-text resize-none h-24 focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full gradient-primary text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all shadow-lg shadow-primary/30 glow-primary"
          >
            Completa il diario ✨
          </button>
        </div>
      </StepContainer>
    );
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
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {renderStep()}
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
        selected
          ? `${gradient} text-white shadow-lg shadow-primary/30 glow-primary`
          : 'glass text-text'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        selected ? 'bg-white/25' : `${gradient}`
      }`}>
        <span className="text-white">{icon}</span>
      </div>
      {label}
    </button>
  );
}
