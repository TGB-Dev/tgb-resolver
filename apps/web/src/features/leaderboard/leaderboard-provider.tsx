import { type ReadonlySignal, signal } from "@preact/signals-react";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const LeaderboardContext = createContext<ReadonlySignal<boolean>>(signal(false));

interface LeaderboardProviderProps {
  isBigScreen?: boolean;
  children: ReactNode;
}

export function LeaderboardProvider({ isBigScreen = false, children }: LeaderboardProviderProps) {
  return (
    <LeaderboardContext.Provider value={signal(isBigScreen)}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useIsBigScreen(): ReadonlySignal<boolean> {
  return useContext(LeaderboardContext);
}
