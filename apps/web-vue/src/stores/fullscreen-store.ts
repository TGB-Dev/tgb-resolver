import { defineStore } from "pinia";
import { ref } from "vue";

function syncIsFullscreen() {
  return document.fullscreenElement != null;
}

export const useFullscreenStore = defineStore("fullscreen", () => {
  const isFullscreen = ref(typeof document !== "undefined" ? syncIsFullscreen() : false);

  if (typeof document !== "undefined") {
    document.addEventListener("fullscreenchange", () => {
      isFullscreen.value = syncIsFullscreen();
    });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }

  return { isFullscreen, toggleFullscreen };
});
