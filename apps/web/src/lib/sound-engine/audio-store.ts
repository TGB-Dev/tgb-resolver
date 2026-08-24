import { defineStore } from "pinia";
import { ref } from "vue";

import { soundEngine } from "./index";

export const useAudioStore = defineStore("audio", () => {
  const isPlaying = ref(false);

  function toggle() {
    const next = !isPlaying.value;
    if (next) {
      void soundEngine.resume();
    } else {
      soundEngine.stopBackgroundMusic();
    }
    isPlaying.value = next;
  }

  return { isPlaying, toggle };
});
