import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useCallback, useRef } from "react";

export interface UseActionOptions {
  handler: () => void;
  enabled: boolean;
  hotkeys?: RegisterableHotkey[];
}

export interface Action {
  readonly execute: () => void;
  readonly enabled: boolean;
  readonly buttonProps: {
    readonly onClick: () => void;
    readonly disabled: boolean;
  };
}

export function useAction({ handler, enabled, hotkeys = [] }: UseActionOptions): Action {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const execute = useCallback(() => {
    if (enabledRef.current) {
      handlerRef.current();
    }
  }, []);

  useHotkeys(
    hotkeys.map((key) => ({ hotkey: key, callback: execute })),
    { enabled },
  );

  return {
    execute,
    enabled,
    get buttonProps() {
      return { onClick: execute, disabled: !enabled };
    },
  };
}
