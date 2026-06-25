import { create } from "zustand";
import { apiClient } from "@/lib/api";
import { useControlStore } from "./control.store";

interface ResolveStore {
  starting: boolean;
  resetting: boolean;
  start: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useResolveStore = create<ResolveStore>((set) => ({
  starting: false,
  resetting: false,
  start: async () => {
    const show = useControlStore.getState().show;
    if (!show) return;

    set({ starting: true });
    const response = await apiClient.playback.start.post({ showVersion: show.showVersion });
    if (response.error) throw new Error("Failed to start playback");
    useControlStore.setState({
      show: response.data,
      rows: useControlStore.getState().rows,
    });
    await useControlStore.getState().loadShow();
    set({ starting: false });
  },
  reset: async () => {
    const show = useControlStore.getState().show;
    if (!show) return;

    set({ resetting: true });
    const response = await apiClient.playback.reset.post({ showVersion: show.showVersion });
    if (response.error) throw new Error("Failed to reset playback");
    await useControlStore.getState().loadShow();
    set({ resetting: false });
  },
}));
