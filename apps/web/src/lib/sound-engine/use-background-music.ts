import { useEffect } from "react";

import { audioModel } from "./audio.model";
import { soundEngine } from "./index";

export function useBackgroundMusic(shouldPlay: boolean): void {
  const isPlaying = audioModel.isPlaying.value;

  useEffect(() => {
    if (shouldPlay && isPlaying) {
      soundEngine.playBackgroundMusic();
    } else {
      soundEngine.stopBackgroundMusic();
    }

    return () => {
      soundEngine.stopBackgroundMusic();
    };
  }, [shouldPlay, isPlaying]);
}
