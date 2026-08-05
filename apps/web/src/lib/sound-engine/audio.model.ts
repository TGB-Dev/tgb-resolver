import { createModel, type Signal, signal } from "@preact/signals-react";

import { soundEngine } from "./index";

interface AudioModel {
  isPlaying: Signal<boolean>;
  toggle: () => void;
}

const AudioModelStore = createModel<AudioModel>(() => {
  const isPlaying = signal(false);

  return {
    isPlaying,
    toggle: () => {
      const next = !isPlaying.value;
      if (next) {
        void soundEngine.resume();
      } else {
        soundEngine.stopBackgroundMusic();
      }
      isPlaying.value = next;
    },
  };
});

export const audioModel = new AudioModelStore();
