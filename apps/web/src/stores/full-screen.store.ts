import { create } from "zustand";

interface FullScreenStore {
  isFullscreen: boolean;
  toggle: () => void;
  enter: () => void;
}

function syncIsFullscreen() {
  return document.fullscreenElement != null;
}

export const useFullScreenStore = create<FullScreenStore>((set) => {
  if (typeof document !== "undefined") {
    document.addEventListener("fullscreenchange", () => {
      set({ isFullscreen: syncIsFullscreen() });
    });
  }

  return {
    isFullscreen: typeof document !== "undefined" ? syncIsFullscreen() : false,

    toggle: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },

    enter: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      }
    },
  };
});
