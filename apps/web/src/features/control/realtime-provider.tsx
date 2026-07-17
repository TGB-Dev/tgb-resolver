import { useQueryClient } from "@tanstack/preact-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { createShowWebSocketManager, type ShowConnectionStatus } from "@/lib/api";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";

interface ControlRealtimeContextValue {
  connectionStatus: ShowConnectionStatus;
  reconnectAttempt: number;
  reconnectNow: () => Promise<void>;
}

const ControlRealtimeContext = createContext<ControlRealtimeContextValue | null>(null);
const STRICT_MODE_DISCONNECT_DELAY_MS = 250;

interface RealtimeListener {
  onOpen: (attempt: number) => void | Promise<void>;
  onClose: (
    nextStatus: Exclude<ShowConnectionStatus, "idle" | "connected">,
    attempt: number,
  ) => void;
  onError: (attempt: number, error?: unknown) => void;
  onMessage: Parameters<
    Parameters<typeof createShowWebSocketManager>[0]["onMessage"]
  >[0] extends infer T
    ? (message: T) => void | Promise<void>
    : never;
}

const realtimeListeners = new Set<RealtimeListener>();
let sharedConnectionStatus: ShowConnectionStatus = "connecting";
let sharedReconnectAttempt = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

const sharedManager = createShowWebSocketManager({
  onOpen: async (attempt) => {
    sharedConnectionStatus = "connected";
    sharedReconnectAttempt = attempt;
    await Promise.all(Array.from(realtimeListeners, (listener) => listener.onOpen(attempt)));
  },
  onClose: (nextStatus, attempt) => {
    sharedConnectionStatus = nextStatus;
    sharedReconnectAttempt = attempt;
    for (const listener of realtimeListeners) {
      listener.onClose(nextStatus, attempt);
    }
  },
  onError: (attempt, error) => {
    sharedReconnectAttempt = attempt;
    for (const listener of realtimeListeners) {
      listener.onError(attempt, error);
    }
  },
  onMessage: async (message) => {
    await Promise.all(Array.from(realtimeListeners, (listener) => listener.onMessage(message)));
  },
});

export function ControlRealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<ShowConnectionStatus>(sharedConnectionStatus);
  const [reconnectAttempt, setReconnectAttempt] = useState(sharedReconnectAttempt);

  useEffect(() => {
    const listener: RealtimeListener = {
      onOpen: async (attempt) => {
        setConnectionStatus("connected");
        setReconnectAttempt(attempt);
        await queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
      },
      onClose: (nextStatus, attempt) => {
        setConnectionStatus(nextStatus);
        setReconnectAttempt(attempt);
      },
      onError: (attempt, error) => {
        setReconnectAttempt(attempt);
        if (error) {
          console.error("Show hub connection error", error);
        }
      },
      onMessage: async (message) => {
        await applyControlRealtimeMessage(queryClient, message);
      },
    };

    realtimeListeners.add(listener);
    setConnectionStatus(sharedConnectionStatus);
    setReconnectAttempt(sharedReconnectAttempt);

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    void sharedManager.connect().catch((error) => {
      console.error("Failed to connect to show hub", error);
    });

    return () => {
      realtimeListeners.delete(listener);

      if (realtimeListeners.size > 0) {
        return;
      }

      disconnectTimer = setTimeout(() => {
        disconnectTimer = null;
        if (realtimeListeners.size === 0) {
          sharedManager.disconnect();
        }
      }, STRICT_MODE_DISCONNECT_DELAY_MS);
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      connectionStatus,
      reconnectAttempt,
      reconnectNow: () => sharedManager.reconnectNow(),
    }),
    [connectionStatus, reconnectAttempt],
  );

  return <ControlRealtimeContext value={value}>{children}</ControlRealtimeContext>;
}

export function useControlRealtime() {
  const context = useContext(ControlRealtimeContext);

  if (!context) {
    throw new Error("useControlRealtime must be used within ControlRealtimeProvider");
  }

  return context;
}
