import { atom } from "jotai";

import { apiClient } from "@/lib/api";

import { controlCanMutateAtom, controlShowAtom, loadControlShowAtom } from "./control";

export const resolveStartingAtom = atom(false);
export const resolveResettingAtom = atom(false);

export const startResolveAtom = atom(null, async (get, set) => {
  const show = get(controlShowAtom);
  if (!show) return;
  if (!get(controlCanMutateAtom)) {
    throw new Error("Control connection is offline");
  }

  set(resolveStartingAtom, true);
  try {
    const response = await apiClient.playback.start.post({ showVersion: show.showVersion });
    if (response.error) throw new Error("Failed to start playback");
    set(controlShowAtom, response.data);
    await set(loadControlShowAtom);
  } finally {
    set(resolveStartingAtom, false);
  }
});

export const resetResolveAtom = atom(null, async (get, set) => {
  const show = get(controlShowAtom);
  if (!show) return;
  if (!get(controlCanMutateAtom)) {
    throw new Error("Control connection is offline");
  }

  set(resolveResettingAtom, true);
  try {
    const response = await apiClient.playback.reset.post({ showVersion: show.showVersion });
    if (response.error) throw new Error("Failed to reset playback");
    await set(loadControlShowAtom);
  } finally {
    set(resolveResettingAtom, false);
  }
});
