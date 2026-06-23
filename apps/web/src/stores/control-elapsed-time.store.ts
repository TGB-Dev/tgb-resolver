import { create } from "zustand";

interface ElapsedTimeStore {
  startedAt: number | null;
  markStarted: () => void;
  resetStarted: () => void;
}

export const useControlElapsedTimeStore = create<ElapsedTimeStore>((set) => ({
  startedAt: null,
  markStarted: () => set({ startedAt: Date.now() }),
  resetStarted: () => set({ startedAt: null }),
}));
