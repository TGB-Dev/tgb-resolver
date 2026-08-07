import { type ReadonlySignal, signal } from "@preact/signals-react";

export const isBigScreenSignal = signal(false);

export function useIsBigScreen(): ReadonlySignal<boolean> {
  return isBigScreenSignal;
}
