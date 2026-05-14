'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppUser, ContractItem, DailyEntry, RehabVideo, ContractResponse } from './types';
import { mockContractItems, mockEntries, mockVideos } from './mock-data';

interface DiaryDraft {
  mood?: number;
  didTherapy?: boolean;
  therapyMinutes?: number;
  feeling?: number;
  noticedCompensations?: boolean;
  compensationNotes?: string;
  contractResponses: ContractResponse[];
  notes?: string;
}

interface AppState {
  user: AppUser | null;
  contractItems: ContractItem[];
  entries: DailyEntry[];
  videos: RehabVideo[];
  diaryDraft: DiaryDraft;
  selectedPatientId: string | null;

  setUser: (user: AppUser | null) => void;
  setSelectedPatientId: (id: string | null) => void;

  todayCompleted: () => boolean;
  getStreak: () => number;
  getComplianceRate: () => number;

  updateDiaryDraft: (updates: Partial<DiaryDraft>) => void;
  resetDiaryDraft: () => void;
  submitDiary: () => void;

  addVideo: (video: RehabVideo) => void;
  addContractItem: (item: ContractItem) => void;
  toggleContractItem: (id: string) => void;
}

const emptyDraft: DiaryDraft = {
  contractResponses: [],
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      contractItems: mockContractItems,
      entries: mockEntries,
      videos: mockVideos,
      diaryDraft: { ...emptyDraft },
      selectedPatientId: null,

      setUser: (user) => set({ user }),
      setSelectedPatientId: (id) => set({ selectedPatientId: id }),

      todayCompleted: () => {
        const { entries } = get();
        return entries.some((e) => e.date === todayStr() && e.completedAt);
      },

      getStreak: () => {
        const { entries } = get();
        const sorted = [...entries]
          .filter((e) => e.completedAt)
          .sort((a, b) => b.date.localeCompare(a.date));
        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 30; i++) {
          const dateStr = d.toISOString().split('T')[0];
          if (sorted.find((e) => e.date === dateStr)) {
            streak++;
          } else if (i > 0) {
            break;
          }
          d.setDate(d.getDate() - 1);
        }
        return streak;
      },

      getComplianceRate: () => {
        const { entries } = get();
        const last7 = entries
          .filter((e) => e.completedAt)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7);
        if (last7.length === 0) return 0;
        let totalYes = 0;
        let totalResponses = 0;
        for (const entry of last7) {
          for (const r of entry.contractResponses) {
            totalResponses++;
            if (r.response === 'yes') totalYes++;
            else if (r.response === 'partial') totalYes += 0.5;
          }
        }
        return totalResponses > 0 ? Math.round((totalYes / totalResponses) * 100) : 0;
      },

      updateDiaryDraft: (updates) =>
        set((state) => ({
          diaryDraft: { ...state.diaryDraft, ...updates },
        })),

      resetDiaryDraft: () => set({ diaryDraft: { ...emptyDraft } }),

      submitDiary: () => {
        const { diaryDraft, entries } = get();
        const newEntry: DailyEntry = {
          id: `entry-${Date.now()}`,
          patientId: 'patient-1',
          date: todayStr(),
          mood: diaryDraft.mood,
          didTherapy: diaryDraft.didTherapy ?? false,
          therapyMinutes: diaryDraft.therapyMinutes,
          feeling: diaryDraft.feeling,
          noticedCompensations: diaryDraft.noticedCompensations,
          compensationNotes: diaryDraft.compensationNotes,
          contractResponses: diaryDraft.contractResponses,
          notes: diaryDraft.notes,
          completedAt: new Date().toISOString(),
        };
        set({
          entries: [newEntry, ...entries.filter((e) => e.date !== todayStr())],
          diaryDraft: { ...emptyDraft },
        });
      },

      addVideo: (video) =>
        set((state) => ({ videos: [video, ...state.videos] })),

      addContractItem: (item) =>
        set((state) => ({ contractItems: [...state.contractItems, item] })),

      toggleContractItem: (id) =>
        set((state) => ({
          contractItems: state.contractItems.map((ci) =>
            ci.id === id ? { ...ci, isActive: !ci.isActive } : ci
          ),
        })),
    }),
    {
      name: 'rehab-diary-storage',
      partialize: (state) => ({
        user: state.user,
        entries: state.entries,
        videos: state.videos,
        contractItems: state.contractItems,
      }),
    }
  )
);
