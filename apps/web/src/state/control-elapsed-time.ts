import { atom } from "jotai";

import { getServerNow } from "@/lib/api";

export const controlStartedAtAtom = atom<number | null>(null);

export const markControlStartedAtom = atom(null, (_get, set) => {
  set(controlStartedAtAtom, getServerNow());
});

export const resetControlStartedAtom = atom(null, (_get, set) => {
  set(controlStartedAtAtom, null);
});
