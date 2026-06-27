import { atom } from "jotai";

export const controlStartedAtAtom = atom<number | null>(null);

export const markControlStartedAtom = atom(null, (_get, set) => {
  set(controlStartedAtAtom, Date.now());
});

export const resetControlStartedAtom = atom(null, (_get, set) => {
  set(controlStartedAtAtom, null);
});
