import { atom } from "jotai";

import { appStore } from "./control";

function syncIsFullscreen() {
  return document.fullscreenElement != null;
}

export const isFullscreenAtom = atom(typeof document !== "undefined" ? syncIsFullscreen() : false);

let hasBoundFullscreenListener = false;

function ensureFullscreenListener() {
  if (typeof document === "undefined" || hasBoundFullscreenListener) {
    return;
  }

  hasBoundFullscreenListener = true;
  document.addEventListener("fullscreenchange", () => {
    appStore.set(isFullscreenAtom, syncIsFullscreen());
  });
}

ensureFullscreenListener();

export const toggleFullscreenAtom = atom(null, async () => {
  ensureFullscreenListener();
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.documentElement.requestFullscreen();
  }
});
