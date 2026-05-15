export interface Patient {
  id: string;
  name: string;
  email: string;
  sex?: 'M' | 'F';
  avatarUrl?: string;
  startDate: string;
  therapistId: string;
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

export interface ContractItem {
  id: string;
  patientId: string;
  type: 'general' | 'specific';
  text: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export type TernaryResponse = 'yes' | 'no' | 'partial';

export interface DailyEntry {
  id: string;
  patientId: string;
  date: string;
  mood?: number;
  didTherapy: boolean;
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
  compensationNotes?: string;
  contractResponses: ContractResponse[];
  notes?: string;
  completedAt?: string;
}

export interface ContractResponse {
  contractItemId: string;
  response: 'yes' | 'no' | 'partial';
  notes?: string;
}

export interface RehabVideo {
  id: string;
  patientId: string;
  title: string;
  date: string;
  thumbnailUrl?: string;
  googleDriveUrl?: string;
  duration?: string;
  notes?: string;
  uploadedAt: string;
}

export type UserRole = 'patient' | 'admin';

export interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  sex?: 'M' | 'F';
  isDemo?: boolean;
}
