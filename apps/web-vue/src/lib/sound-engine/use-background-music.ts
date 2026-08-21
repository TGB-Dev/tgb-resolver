import { watchEffect } from "vue";

import { useAudioStore } from "./audio-store";
import { soundEngine } from "./index";

/** Play/stop background music while `shouldPlay` and the audio store agree. */
export function useBackgroundMusic(shouldPlay: () => boolean): void {
  const audio = useAudioStore();

  watchEffect((onCleanup) => {
    if (shouldPlay() && audio.isPlaying) {
      soundEngine.playBackgroundMusic();
    } else {
      soundEngine.stopBackgroundMusic();
    }
    onCleanup(() => {
      soundEngine.stopBackgroundMusic();
    });
  });
}
