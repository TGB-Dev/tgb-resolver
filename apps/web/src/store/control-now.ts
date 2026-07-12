import { create } from "zustand";

import { getServerNow } from "@/lib/api";

interface ControlNowStore {
  now: number;
  setNow: (now: number) => void;
}

export const useControlNowStore = create<ControlNowStore>((set) => ({
  now: getServerNow(),
  setNow: (now: number) => set({ now }),
}));
