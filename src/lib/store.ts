'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppUser, ContractItem, DailyEntry, RehabVideo, ContractResponse, TernaryResponse } from './types';
import { mockContractItems, mockEntries, mockVideos } from './mock-data';
import {
  getContractItems,
  getDailyEntries,
  getVideos,
  saveDailyEntry,
  deleteDailyEntry,
  saveVideo as saveVideoToFirestore,
} from './firestore';

interface DiaryDraft {
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
  firestoreLoaded: boolean;

  setUser: (user: AppUser | null) => void;
  setSelectedPatientId: (id: string | null) => void;
  loadFromFirestore: (patientId: string) => Promise<void>;

  todayCompleted: () => boolean;
  getStreak: () => number;
  getComplianceRate: () => number;

  updateDiaryDraft: (updates: Partial<DiaryDraft>) => void;
  resetDiaryDraft: () => void;
  submitDiary: () => void;
  resetTodayEntry: () => Promise<void>;

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
      firestoreLoaded: false,

      setUser: (user) => {
        if (!user) {
          set({ user: null, firestoreLoaded: false });
          return;
        }
        set({ user });
        if (!user.isDemo && !get().firestoreLoaded) {
          get().loadFromFirestore(user.id);
        }
      },

      setSelectedPatientId: (id) => set({ selectedPatientId: id }),

      loadFromFirestore: async (patientId: string) => {
        try {
          const [items, dailyEntries, vids] = await Promise.all([
            getContractItems(patientId),
            getDailyEntries(patientId),
            getVideos(patientId),
          ]);
          set({
            contractItems: items.length > 0 ? items : [],
            entries: dailyEntries,
            videos: vids,
            firestoreLoaded: true,
          });
        } catch (err) {
          console.warn('Failed to load from Firestore:', err);
          set({ contractItems: [], entries: [], videos: [], firestoreLoaded: true });
        }
      },

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
        const { diaryDraft, entries, user } = get();
        const patientId = user?.id || 'patient-1';
        const newEntry: DailyEntry = {
          id: `entry-${Date.now()}`,
          patientId,
          date: todayStr(),
          mood: diaryDraft.mood,
          didTherapy: diaryDraft.didTherapy ?? false,
          therapyMinutes: diaryDraft.therapyMinutes,
          feeling: diaryDraft.feeling,
          noTherapyReason: diaryDraft.noTherapyReason,
          practicedActions: diaryDraft.practicedActions,
          noPracticedActionsReason: diaryDraft.noPracticedActionsReason,
          selectedActions: diaryDraft.selectedActions,
          handInOtherActivities: diaryDraft.handInOtherActivities,
          noHandReason: diaryDraft.noHandReason,
          posture: diaryDraft.posture,
          noticedCompensations: diaryDraft.noticedCompensations,
          compensationTypes: diaryDraft.compensationTypes,
          compensationNotes: diaryDraft.compensationNotes,
          contractResponses: diaryDraft.contractResponses,
          notes: diaryDraft.notes,
          completedAt: new Date().toISOString(),
        };
        set({
          entries: [newEntry, ...entries.filter((e) => e.date !== todayStr())],
          diaryDraft: { ...emptyDraft },
        });
        if (user && !user.isDemo) {
          saveDailyEntry(newEntry).then((firestoreId) => {
            set((state) => ({
              entries: state.entries.map((e) =>
                e.id === newEntry.id ? { ...e, id: firestoreId } : e
              ),
            }));
          }).catch((err) => console.warn('Failed to save entry to Firestore:', err));
        }
      },

      resetTodayEntry: async () => {
        const { entries, user } = get();
        const today = todayStr();
        const todayEntry = entries.find((e) => e.date === today);
        set({
          entries: entries.filter((e) => e.date !== today),
          diaryDraft: { ...emptyDraft },
        });
        if (todayEntry && user && !user.isDemo) {
          try {
            await deleteDailyEntry(todayEntry.id);
          } catch (err) {
            console.warn('Failed to delete entry from Firestore:', err);
          }
        }
      },

      addVideo: (video) => {
        set((state) => ({ videos: [video, ...state.videos] }));
        const user = get().user;
        if (user && !user.isDemo) {
          saveVideoToFirestore(video).catch((err) =>
            console.warn('Failed to save video to Firestore:', err)
          );
        }
      },

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
      version: 2,
      partialize: (state) => ({
        user: state.user,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const fallback = { user: null as AppUser | null };
        if (!persistedState || typeof persistedState !== 'object') return fallback;
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          delete state.entries;
          delete state.videos;
          delete state.contractItems;
        }
        return { user: (state.user as AppUser | null) ?? null };
      },
    }
  )
);
