import { ContractItem } from './types';

export interface ContractCommitment {
  id: string;
  question: string;
  text: string;
  type: 'general' | 'specific';
  icon: string;
}

export const CONTRACT_COMMITMENTS: ContractCommitment[] = [
  {
    id: 'reab-5days',
    question: 'Sei pronto/a a impegnarti a fare riabilitazione almeno 5 giorni a settimana?',
    text: 'Fare riabilitazione almeno 5 giorni a settimana',
    type: 'general',
    icon: 'calendar-check',
  },
  {
    id: 'reab-1hour',
    question: 'Sei pronto/a a eseguire almeno 1 ora di terapia al giorno?',
    text: 'Eseguire almeno 1 ora di terapia al giorno',
    type: 'general',
    icon: 'clock',
  },
  {
    id: 'diary-daily',
    question: 'Sei pronto/a a compilare il diario ogni giorno per tenere traccia dei tuoi progressi?',
    text: 'Compilare il diario quotidianamente',
    type: 'general',
    icon: 'book-open',
  },
  {
    id: 'hand-daily',
    question: 'Sei pronto/a a usare la mano coinvolta anche in attività quotidiane fuori dalla terapia?',
    text: 'Usare la mano coinvolta nelle attività quotidiane',
    type: 'general',
    icon: 'hand',
  },
  {
    id: 'avoid-compensations',
    question: 'Sei pronto/a a prestare attenzione a non sviluppare compensi durante i movimenti?',
    text: 'Evitare compensi durante i movimenti',
    type: 'general',
    icon: 'trending-down',
  },
  {
    id: 'posture',
    question: 'Sei pronto/a a mantenere una postura simmetrica quando sei seduto/a?',
    text: 'Mantenere postura simmetrica',
    type: 'general',
    icon: 'accessibility',
  },
  {
    id: 'practice-mal',
    question: 'Sei pronto/a a esercitarti su un set di azioni quotidiane concordate col tuo terapista (es. aprire una porta, bere, mangiare con la posata)?',
    text: 'Esercitarsi su azioni MAL concordate',
    type: 'specific',
    icon: 'biceps-flexed',
  },
];

export interface ContractAnswer {
  accepted: string[];
  rejected: string[];
}

export function nextCommitment(answer: ContractAnswer): ContractCommitment | null {
  for (const c of CONTRACT_COMMITMENTS) {
    if (!answer.accepted.includes(c.id) && !answer.rejected.includes(c.id)) {
      return c;
    }
  }
  return null;
}

export function buildContractItems(
  patientId: string,
  answer: ContractAnswer
): ContractItem[] {
  const now = new Date().toISOString();
  return CONTRACT_COMMITMENTS
    .filter((c) => answer.accepted.includes(c.id))
    .map((c) => ({
      id: `ci-${c.id}-${Date.now()}`,
      patientId,
      type: c.type,
      text: c.text,
      icon: c.icon,
      isActive: true,
      createdAt: now,
    }));
}
