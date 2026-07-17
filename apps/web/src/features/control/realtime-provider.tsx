import { useQueryClient } from "@tanstack/preact-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

import RealtimeWorker from "@/lib/realtime.worker?worker";
import {
  createRealtimeClient,
  ShowConnectionStatus,
  type ShowWebSocketMessage,
} from "@tgb-resolver/realtime";
import type { RealtimeClientCallbacks } from "@tgb-resolver/realtime";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";

interface ControlRealtimeContextValue {
  connectionStatus: ShowConnectionStatus;
  reconnectAttempt: number;
  reconnectNow: () => Promise<void>;
}

const ControlRealtimeContext = createContext<ControlRealtimeContextValue | null>(null);
const STRICT_MODE_DISCONNECT_DELAY_MS = 250;

interface RealtimeListener {
  onStatusChange: (status: ShowConnectionStatus, attempt: number) => void;
  onMessage: (message: ShowWebSocketMessage) => void;
  onError: (attempt: number, error?: unknown) => void;
}

const realtimeListeners = new Set<RealtimeListener>();
let sharedConnectionStatus: ShowConnectionStatus = ShowConnectionStatus.Connecting;
let sharedReconnectAttempt = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

const sharedClient = createRealtimeClient(API_BASE_URL, {
  onMessage: async (message) => {
    await Promise.all(Array.from(realtimeListeners, (listener) => listener.onMessage(message)));
  },
  onError: (attempt, error) => {
    sharedReconnectAttempt = attempt;
    for (const listener of realtimeListeners) {
      listener.onError(attempt, error);
    }
  },
} satisfies RealtimeClientCallbacks,
new RealtimeWorker(),
);

sharedClient.onStatusChange((status, attempt) => {
  sharedConnectionStatus = status;
  sharedReconnectAttempt = attempt;
  for (const listener of realtimeListeners) {
    listener.onStatusChange(status, attempt);
  }
});

export function ControlRealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<ShowConnectionStatus>(sharedConnectionStatus);
  const [reconnectAttempt, setReconnectAttempt] = useState(sharedReconnectAttempt);

  useEffect(() => {
    const listener: RealtimeListener = {
      onStatusChange: (status, attempt) => {
        setConnectionStatus(status);
        setReconnectAttempt(attempt);

        if (status === ShowConnectionStatus.Connected) {
          void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
        }
      },
      onMessage: async (message) => {
        await applyControlRealtimeMessage(queryClient, message);
      },
      onError: (attempt, error) => {
        setReconnectAttempt(attempt);
        if (error) {
          console.error("Show hub connection error", error);
        }
      },
    };

    realtimeListeners.add(listener);
    setConnectionStatus(sharedConnectionStatus);
    setReconnectAttempt(sharedReconnectAttempt);

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    void sharedClient.connect().catch((error) => {
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
          sharedClient.disconnect();
        }
      }, STRICT_MODE_DISCONNECT_DELAY_MS);
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      connectionStatus,
      reconnectAttempt,
      reconnectNow: () => sharedClient.reconnectNow(),
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
