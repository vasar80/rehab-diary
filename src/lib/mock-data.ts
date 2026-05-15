import { Patient, Therapist, ContractItem, DailyEntry, RehabVideo } from './types';

export const mockTherapist: Therapist = {
  id: 'therapist-1',
  name: 'Dr.ssa Laura Bianchi',
  email: 'l.bianchi@rehabclinic.it',
  specialty: 'Neuroriabilitazione',
};

export const mockPatient: Patient = {
  id: 'patient-1',
  name: 'Mario Rossi',
  email: 'mario.rossi@email.it',
  startDate: '2025-04-01',
  therapistId: 'therapist-1',
};

export const mockPatients: Patient[] = [
  mockPatient,
  {
    id: 'patient-2',
    name: 'Anna Verdi',
    email: 'anna.verdi@email.it',
    startDate: '2025-03-15',
    therapistId: 'therapist-1',
  },
  {
    id: 'patient-3',
    name: 'Giuseppe Neri',
    email: 'g.neri@email.it',
    startDate: '2025-05-01',
    therapistId: 'therapist-1',
  },
];

export const mockContractItems: ContractItem[] = [
  {
    id: 'ci-1',
    patientId: 'patient-1',
    type: 'general',
    text: 'Fare riabilitazione almeno 5 giorni a settimana',
    icon: 'calendar-check',
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ci-2',
    patientId: 'patient-1',
    type: 'general',
    text: 'Eseguire almeno 1 ora di terapia al giorno',
    icon: 'clock',
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ci-3',
    patientId: 'patient-1',
    type: 'general',
    text: 'Compilare il diario quotidianamente',
    icon: 'book-open',
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ci-4',
    patientId: 'patient-1',
    type: 'specific',
    text: 'Tenere la mano aperta sul tavolo durante i pasti',
    icon: 'hand',
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ci-5',
    patientId: 'patient-1',
    type: 'specific',
    text: 'Mantenere la simmetria delle spalle da seduto',
    icon: 'accessibility',
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ci-6',
    patientId: 'patient-1',
    type: 'specific',
    text: 'Ridurre il tempo trascorso in carrozzina',
    icon: 'trending-down',
    isActive: true,
    createdAt: '2025-04-01',
  },
  {
    id: 'ci-7',
    patientId: 'patient-1',
    type: 'specific',
    text: 'Usare il braccio destro nelle attività quotidiane',
    icon: 'biceps-flexed',
    isActive: true,
    createdAt: '2025-04-01',
  },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export const mockEntries: DailyEntry[] = [
  {
    id: 'entry-1',
    patientId: 'patient-1',
    date: daysAgo(1),
    mood: 4,
    didTherapy: true,
    therapyMinutes: 60,
    feeling: 4,
    noticedCompensations: false,
    contractResponses: [
      { contractItemId: 'ci-4', response: 'yes' },
      { contractItemId: 'ci-5', response: 'yes' },
      { contractItemId: 'ci-6', response: 'partial' },
      { contractItemId: 'ci-7', response: 'yes' },
    ],
    notes: 'Buona giornata, mi sento più stabile.',
    completedAt: daysAgo(1) + 'T18:30:00',
  },
  {
    id: 'entry-2',
    patientId: 'patient-1',
    date: daysAgo(2),
    mood: 3,
    didTherapy: true,
    therapyMinutes: 45,
    feeling: 3,
    noticedCompensations: true,
    compensationNotes: 'Ho notato che tendo a inclinare il busto a sinistra quando cammino.',
    contractResponses: [
      { contractItemId: 'ci-4', response: 'yes' },
      { contractItemId: 'ci-5', response: 'no' },
      { contractItemId: 'ci-6', response: 'yes' },
      { contractItemId: 'ci-7', response: 'partial' },
    ],
    completedAt: daysAgo(2) + 'T19:15:00',
  },
  {
    id: 'entry-3',
    patientId: 'patient-1',
    date: daysAgo(3),
    mood: 4,
    didTherapy: true,
    therapyMinutes: 75,
    feeling: 5,
    noticedCompensations: false,
    contractResponses: [
      { contractItemId: 'ci-4', response: 'yes' },
      { contractItemId: 'ci-5', response: 'yes' },
      { contractItemId: 'ci-6', response: 'yes' },
      { contractItemId: 'ci-7', response: 'yes' },
    ],
    notes: 'Sessione fantastica con il fisioterapista!',
    completedAt: daysAgo(3) + 'T17:00:00',
  },
  {
    id: 'entry-4',
    patientId: 'patient-1',
    date: daysAgo(4),
    mood: 2,
    didTherapy: false,
    therapyMinutes: 0,
    feeling: 2,
    noticedCompensations: false,
    contractResponses: [
      { contractItemId: 'ci-4', response: 'no' },
      { contractItemId: 'ci-5', response: 'partial' },
      { contractItemId: 'ci-6', response: 'no' },
      { contractItemId: 'ci-7', response: 'no' },
    ],
    notes: 'Giornata difficile, molta stanchezza.',
    completedAt: daysAgo(4) + 'T20:00:00',
  },
  {
    id: 'entry-5',
    patientId: 'patient-1',
    date: daysAgo(5),
    mood: 4,
    didTherapy: true,
    therapyMinutes: 60,
    feeling: 4,
    noticedCompensations: false,
    contractResponses: [
      { contractItemId: 'ci-4', response: 'yes' },
      { contractItemId: 'ci-5', response: 'yes' },
      { contractItemId: 'ci-6', response: 'partial' },
      { contractItemId: 'ci-7', response: 'yes' },
    ],
    completedAt: daysAgo(5) + 'T18:00:00',
  },
];

export const mockVideos: RehabVideo[] = [];
