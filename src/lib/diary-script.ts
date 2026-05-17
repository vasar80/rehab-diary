import { DailyEntry, TernaryResponse } from './types';

export interface DiaryAnswer {
  mood?: number;
  didTherapy?: boolean;
  therapyMinutes?: number;
  feeling?: number;
  noTherapyReason?: string;
  practicedActions?: TernaryResponse;
  noPracticedActionsReason?: string;
  selectedActions?: string[];
  handInOtherActivities?: TernaryResponse;
  noHandReason?: string;
  posture?: TernaryResponse;
  noticedCompensations?: boolean;
  compensationTypes?: string[];
}

export type QuickOption = { label: string; value: string };

export interface DiaryStep {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: QuickOption[];
  placeholder?: string;
  field: keyof DiaryAnswer;
  parse?: (value: string) => unknown;
  display?: (value: unknown) => string;
}

export const MAL_ACTIONS = [
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

export const COMPENSATION_TYPES = [
  'La spalla si sollevava',
  'Il tronco si inclinava',
  'La schiena si muoveva troppo',
  'La mano si poneva rigida',
  'Il polso si chiudeva',
  'Il gomito si fletteva',
];

const TERNARY_OPTIONS: QuickOption[] = [
  { label: 'Sì', value: 'yes' },
  { label: 'In parte', value: 'partial' },
  { label: 'No', value: 'no' },
];

function genderedPast(sex: 'M' | 'F' | undefined, masc: string, fem: string): string {
  return sex === 'F' ? fem : masc;
}

export function nextStep(answer: DiaryAnswer, sex?: 'M' | 'F'): DiaryStep | null {
  const past = (m: string, f: string) => genderedPast(sex, m, f);

  if (answer.mood === undefined) {
    return {
      id: 'mood',
      question: 'Come ti senti oggi?',
      type: 'single',
      options: [
        { label: '😫 Pessimo', value: '1' },
        { label: '😔 Male', value: '2' },
        { label: '😐 Così così', value: '3' },
        { label: '🙂 Bene', value: '4' },
        { label: '😊 Benissimo', value: '5' },
      ],
      field: 'mood',
      parse: (v) => parseInt(v, 10),
      display: (v) => ['', '😫 Pessimo', '😔 Male', '😐 Così così', '🙂 Bene', '😊 Benissimo'][v as number] || '',
    };
  }

  if (answer.didTherapy === undefined) {
    return {
      id: 'therapy',
      question: 'Hai fatto terapia ieri?',
      type: 'single',
      options: [
        { label: 'Sì', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      field: 'didTherapy',
      parse: (v) => v === 'yes',
      display: (v) => (v ? 'Sì' : 'No'),
    };
  }

  if (answer.didTherapy === false) {
    if (answer.noTherapyReason === undefined) {
      return {
        id: 'therapy-reason',
        question: `Cosa è successo? Raccontami perché non sei ${past('riuscito', 'riuscita')} a fare terapia.`,
        type: 'text',
        placeholder: 'Es. mi sentivo stanco, dolore, altri impegni…',
        field: 'noTherapyReason',
      };
    }
    return askCompensations(answer);
  }

  if (answer.therapyMinutes === undefined) {
    return {
      id: 'duration',
      question: 'Per quanto tempo hai fatto terapia?',
      type: 'single',
      options: [
        { label: '30 min', value: '30' },
        { label: '45 min', value: '45' },
        { label: '1 ora', value: '60' },
        { label: '1h 30', value: '90' },
        { label: '2 ore', value: '120' },
      ],
      field: 'therapyMinutes',
      parse: (v) => parseInt(v, 10),
      display: (v) => {
        const m = v as number;
        if (m < 60) return `${m} min`;
        if (m === 60) return '1 ora';
        if (m === 90) return '1h 30';
        return `${Math.floor(m / 60)} ore`;
      },
    };
  }

  if (answer.feeling === undefined) {
    return {
      id: 'feeling',
      question: 'Come è andata la sessione?',
      type: 'single',
      options: [
        { label: '⭐⭐⭐⭐⭐ Eccellente', value: '5' },
        { label: '⭐⭐⭐⭐ Buona', value: '4' },
        { label: '⭐⭐⭐ Nella norma', value: '3' },
        { label: '⭐⭐ Faticosa', value: '2' },
        { label: '⭐ Molto faticosa', value: '1' },
      ],
      field: 'feeling',
      parse: (v) => parseInt(v, 10),
      display: (v) => ['', 'Molto faticosa', 'Faticosa', 'Nella norma', 'Buona', 'Eccellente'][v as number] || '',
    };
  }

  if (answer.practicedActions === undefined) {
    return {
      id: 'actions',
      question: `Sei ${past('riuscito', 'riuscita')} a esercitarti con le azioni concordate con il tuo terapista?`,
      type: 'single',
      options: TERNARY_OPTIONS,
      field: 'practicedActions',
      display: (v) => (v === 'yes' ? 'Sì' : v === 'partial' ? 'In parte' : 'No'),
    };
  }

  if (answer.practicedActions === 'no') {
    if (answer.noPracticedActionsReason === undefined) {
      return {
        id: 'actions-reason',
        question: 'Cosa ti ha impedito di esercitarti?',
        type: 'text',
        placeholder: 'Es. stanchezza, dolore, mancanza di tempo…',
        field: 'noPracticedActionsReason',
      };
    }
  } else if (answer.practicedActions === 'yes' || answer.practicedActions === 'partial') {
    if (answer.selectedActions === undefined) {
      return {
        id: 'actions-list',
        question: 'Quali azioni hai svolto? Selezionane quante vuoi.',
        type: 'multi',
        options: MAL_ACTIONS.map((a) => ({ label: a, value: a })),
        field: 'selectedActions',
      };
    }
  }

  if (answer.handInOtherActivities === undefined) {
    return {
      id: 'hand',
      question: `Hai ${past('usato', 'usata')} la mano in altre attività della giornata? Es. mentre mangiavi, guardavi la TV...`,
      type: 'single',
      options: TERNARY_OPTIONS,
      field: 'handInOtherActivities',
      display: (v) => (v === 'yes' ? 'Sì' : v === 'partial' ? 'In parte' : 'No'),
    };
  }

  if (answer.handInOtherActivities === 'no' && answer.noHandReason === undefined) {
    return {
      id: 'hand-reason',
      question: 'Perché non ti è riuscito?',
      type: 'text',
      placeholder: 'Es. dolore, paura di sbagliare, abitudine…',
      field: 'noHandReason',
    };
  }

  if (answer.posture === undefined) {
    return {
      id: 'posture',
      question: 'Hai fatto attenzione alla postura? Stare seduto simmetrico, senza appoggiare lo schienale.',
      type: 'single',
      options: TERNARY_OPTIONS,
      field: 'posture',
      display: (v) => (v === 'yes' ? 'Sì' : v === 'partial' ? 'In parte' : 'No'),
    };
  }

  return askCompensations(answer);
}

function askCompensations(answer: DiaryAnswer): DiaryStep | null {
  if (answer.noticedCompensations === undefined) {
    return {
      id: 'compensations',
      question: 'Hai notato dei movimenti involontari (compensi) durante i movimenti?',
      type: 'single',
      options: [
        { label: 'Sì', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      field: 'noticedCompensations',
      parse: (v) => v === 'yes',
      display: (v) => (v ? 'Sì' : 'No'),
    };
  }
  if (answer.noticedCompensations === true && answer.compensationTypes === undefined) {
    return {
      id: 'compensation-types',
      question: 'Quali compensi hai notato? Selezionane quanti vuoi.',
      type: 'multi',
      options: COMPENSATION_TYPES.map((c) => ({ label: c, value: c })),
      field: 'compensationTypes',
    };
  }
  return null;
}

export function buildDailyEntryFromAnswer(answer: DiaryAnswer, patientId: string): DailyEntry {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: `entry-${Date.now()}`,
    patientId,
    date: today,
    mood: answer.mood,
    didTherapy: answer.didTherapy ?? false,
    therapyMinutes: answer.therapyMinutes,
    feeling: answer.feeling,
    noTherapyReason: answer.noTherapyReason,
    practicedActions: answer.practicedActions,
    noPracticedActionsReason: answer.noPracticedActionsReason,
    selectedActions: answer.selectedActions,
    handInOtherActivities: answer.handInOtherActivities,
    noHandReason: answer.noHandReason,
    posture: answer.posture,
    noticedCompensations: answer.noticedCompensations,
    compensationTypes: answer.compensationTypes,
    contractResponses: [],
    completedAt: new Date().toISOString(),
  };
}
