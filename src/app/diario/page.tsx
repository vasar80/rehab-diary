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
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
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
  } = useAppStore();

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
    if (!noticed) {
      setTimeout(goNext, 300);
    }
  }

  function handleSubmit() {
    submitDiary();
    setSubmitted(true);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (todayCompleted() && !submitted) {
    return (
      <div className="min-h-screen bg-bg pb-24">
        <header className="px-5 pt-14 pb-4">
          <div className="mx-auto max-w-md flex items-center">
            <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-xl">
              <ArrowLeft size={22} className="text-text" />
            </button>
            <h1 className="text-lg font-semibold text-text ml-2">Diario</h1>
          </div>
        </header>
        <div className="px-5 mx-auto max-w-md flex flex-col items-center justify-center mt-20">
          <div className="w-16 h-16 bg-success-light rounded-2xl flex items-center justify-center">
            <Check size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-text mt-4">Già completato!</h2>
          <p className="text-text-secondary text-center mt-2">
            Hai già compilato il diario per oggi. Torna domani!
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 bg-primary text-white px-6 py-3 rounded-xl font-semibold"
          >
            Torna alla home
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-success-light rounded-3xl flex items-center justify-center mx-auto">
            <PartyPopper size={36} className="text-success" />
          </div>
          <h2 className="text-2xl font-bold text-text mt-6">Fantastico!</h2>
          <p className="text-text-secondary mt-2 max-w-[260px] mx-auto">
            Hai completato il diario di oggi. Ogni giorno è un passo avanti!
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-8 bg-primary text-white px-8 py-3.5 rounded-xl font-semibold active:scale-[0.98] transition-transform"
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
        <StepContainer
          title="Come ti senti oggi?"
          subtitle="Seleziona il tuo umore"
        >
          <div className="flex justify-between gap-2 mt-8">
            {moodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleMood(opt.value)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl flex-1 transition-all ${
                  diaryDraft.mood === opt.value
                    ? 'bg-primary/10 ring-2 ring-primary scale-105'
                    : 'bg-surface hover:bg-stone-50 active:scale-95'
                }`}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-[10px] font-medium text-text-secondary">{opt.label}</span>
              </button>
            ))}
          </div>
        </StepContainer>
      );
    }

    if (step === 1) {
      return (
        <StepContainer
          title="Hai fatto terapia ieri?"
          subtitle="Seleziona una risposta"
        >
          <div className="space-y-3 mt-8">
            <OptionButton
              selected={diaryDraft.didTherapy === true}
              onClick={() => handleTherapy(true)}
              icon={<Check size={20} />}
              label="Sì, ho fatto terapia"
              color="success"
            />
            <OptionButton
              selected={diaryDraft.didTherapy === false}
              onClick={() => handleTherapy(false)}
              icon={<X size={20} />}
              label="No, non ho fatto terapia"
              color="danger"
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
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDuration(opt.value)}
                className={`py-4 px-4 rounded-2xl text-center font-semibold transition-all ${
                  diaryDraft.therapyMinutes === opt.value
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                    : 'bg-surface text-text hover:bg-stone-50 active:scale-95'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </StepContainer>
      );
    }

    if (step === 3) {
      return (
        <StepContainer
          title="Come è andata la sessione?"
          subtitle="Valuta la tua esperienza"
        >
          <div className="space-y-3 mt-8">
            {[5, 4, 3, 2, 1].map((val) => (
              <button
                key={val}
                onClick={() => handleFeeling(val)}
                className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 transition-all ${
                  diaryDraft.feeling === val
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-surface text-text hover:bg-stone-50 active:scale-[0.98]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  diaryDraft.feeling === val ? 'bg-white/20' : 'bg-primary/10'
                }`}>
                  <span className={diaryDraft.feeling === val ? 'text-white' : 'text-primary'}>
                    {val}
                  </span>
                </div>
                <span className="font-medium">{feelingLabels[val]}</span>
              </button>
            ))}
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
          <div className="space-y-3 mt-8">
            <OptionButton
              selected={currentResponse?.response === 'yes'}
              onClick={() => handleContractResponse(item.id, 'yes')}
              icon={<Check size={20} />}
              label="Sì"
              color="success"
            />
            <OptionButton
              selected={currentResponse?.response === 'partial'}
              onClick={() => handleContractResponse(item.id, 'partial')}
              icon={<span className="text-sm font-bold">~</span>}
              label="In parte"
              color="warning"
            />
            <OptionButton
              selected={currentResponse?.response === 'no'}
              onClick={() => handleContractResponse(item.id, 'no')}
              icon={<X size={20} />}
              label="No"
              color="danger"
            />
          </div>
        </StepContainer>
      );
    }

    return (
      <StepContainer
        title="Ultime domande"
        subtitle="Quasi finito!"
      >
        <div className="space-y-5 mt-6">
          <div>
            <label className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-warning" />
              Hai notato compensi?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => handleCompensations(true)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  diaryDraft.noticedCompensations === true
                    ? 'bg-warning text-white'
                    : 'bg-surface text-text active:scale-95'
                }`}
              >
                Sì
              </button>
              <button
                onClick={() => handleCompensations(false)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  diaryDraft.noticedCompensations === false
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text active:scale-95'
                }`}
              >
                No
              </button>
            </div>
            {diaryDraft.noticedCompensations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3"
              >
                <textarea
                  value={diaryDraft.compensationNotes || ''}
                  onChange={(e) => updateDiaryDraft({ compensationNotes: e.target.value })}
                  placeholder="Descrivi i compensi che hai notato..."
                  className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-text resize-none h-24 focus:outline-none focus:border-primary transition-colors"
                />
              </motion.div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-primary" />
              Note aggiuntive
            </label>
            <textarea
              value={diaryDraft.notes || ''}
              onChange={(e) => updateDiaryDraft({ notes: e.target.value })}
              placeholder="Come è andata la giornata? Qualcosa da segnalare?"
              className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-text resize-none h-24 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg active:scale-[0.98] transition-transform shadow-lg shadow-primary/30 mt-2"
          >
            Completa il diario
          </button>
        </div>
      </StepContainer>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-5 pt-14 pb-2">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="p-2 -ml-2 rounded-xl">
              <ArrowLeft size={22} className="text-text" />
            </button>
            <span className="text-sm font-medium text-text-secondary">
              {step + 1} / {totalSteps}
            </span>
          </div>
          <div className="mt-3 h-1.5 bg-border-light rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md mt-4">
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

      <BottomNav />
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
        <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
          {tag}
        </span>
      )}
      {icon && <div className="mb-3">{icon}</div>}
      <h2 className="text-xl font-bold text-text leading-tight">{title}</h2>
      <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  icon,
  label,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: 'success' | 'danger' | 'warning';
}) {
  const colorMap = {
    success: {
      active: 'bg-success text-white shadow-lg shadow-success/30',
      inactive: 'bg-surface text-text',
      iconBg: 'bg-success-light',
      iconColor: 'text-success',
    },
    danger: {
      active: 'bg-danger text-white shadow-lg shadow-danger/30',
      inactive: 'bg-surface text-text',
      iconBg: 'bg-danger-light',
      iconColor: 'text-danger',
    },
    warning: {
      active: 'bg-warning text-white shadow-lg shadow-warning/30',
      inactive: 'bg-surface text-text',
      iconBg: 'bg-warning-light',
      iconColor: 'text-warning',
    },
  };

  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 px-4 rounded-2xl flex items-center gap-3 font-semibold transition-all active:scale-[0.98] ${
        selected ? c.active : c.inactive
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          selected ? 'bg-white/20' : c.iconBg
        }`}
      >
        <span className={selected ? 'text-white' : c.iconColor}>{icon}</span>
      </div>
      {label}
    </button>
  );
}
