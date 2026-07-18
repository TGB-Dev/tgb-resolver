import { createModel, effect, type ReadonlySignal, signal } from "@preact/signals-react";

interface FullscreenModel {
  isFullscreen: ReadonlySignal<boolean>;
  toggleFullscreen: () => Promise<void>;
}

function syncIsFullscreen() {
  return document.fullscreenElement != null;
}

const FullscreenModel = createModel<FullscreenModel>(() => {
  const isFullscreen = signal(typeof document !== "undefined" ? syncIsFullscreen() : false);

  effect(() => {
    if (typeof document === "undefined") return;
    const handler = () => {
      isFullscreen.value = syncIsFullscreen();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  });

  return {
    isFullscreen,

    async toggleFullscreen() {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    },
  };
});

export const fullscreenModel = new FullscreenModel();
