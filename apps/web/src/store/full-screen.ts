import { create } from "zustand";

interface FullscreenStore {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

function syncIsFullscreen() {
  return document.fullscreenElement != null;
}

export const useFullscreenStore = create<FullscreenStore>((set) => {
  if (typeof document !== "undefined") {
    document.addEventListener("fullscreenchange", () => {
      set({ isFullscreen: syncIsFullscreen() });
    });
  }

  return {
    isFullscreen: typeof document !== "undefined" ? syncIsFullscreen() : false,
    toggleFullscreen: async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    },
  };
});
