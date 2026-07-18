import { useSignal } from "@preact/signals-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import { ShowConnectionStatus, type ShowWebSocketMessage } from "@tgb-resolver/realtime";
import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react";

import { API_BASE_URL } from "@/lib/api";
import RealtimeWorker from "@/lib/realtime.worker?worker";
import { createRealtimeClient, type RealtimeClientCallbacks } from "@/lib/realtime-client";
import { syncPlaybackFromSnapshot } from "@/models/playback-state";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-cache";
import { mapShowStateSnapshotToShowFile } from "./show-mapper";
import { hydrateShowFromSnapshot } from "./show-store";

interface ControlRealtimeContextValue {
  connectionStatus: { readonly value: ShowConnectionStatus };
  reconnectAttempt: { readonly value: number };
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

const sharedClient = createRealtimeClient(
  API_BASE_URL,
  {
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
  const connectionStatus = useSignal<ShowConnectionStatus>(sharedConnectionStatus);
  const reconnectAttempt = useSignal(sharedReconnectAttempt);
  const showQuery = useQuery({
    ...tgbResolverServerFeaturesShowGetShowEndpointOptions({ client: generatedClient }),
    queryKey: controlShowQueryKey(),
    select: mapShowStateSnapshotToShowFile,
  });

  useEffect(() => {
    const listener: RealtimeListener = {
      onStatusChange: (status, attempt) => {
        connectionStatus.value = status;
        reconnectAttempt.value = attempt;

        if (status === ShowConnectionStatus.Connected) {
          void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
        }
      },
      onMessage: async (message) => {
        await applyControlRealtimeMessage(queryClient, message);
      },
      onError: (attempt, error) => {
        reconnectAttempt.value = attempt;
        if (error) {
          console.error("Show hub connection error", error);
        }
      },
    };

    realtimeListeners.add(listener);
    connectionStatus.value = sharedConnectionStatus;
    reconnectAttempt.value = sharedReconnectAttempt;

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
  }, [queryClient, connectionStatus, reconnectAttempt]);

  useEffect(() => {
    if (!showQuery.data?.playback) {
      return;
    }

    hydrateShowFromSnapshot(showQuery.data);
    syncPlaybackFromSnapshot(showQuery.data.showVersion ?? 0, showQuery.data.playback);
  }, [showQuery.data]);

  const value = useMemo(
    () => ({
      connectionStatus,
      reconnectAttempt,
      reconnectNow: () => sharedClient.reconnectNow(),
    }),
    [reconnectAttempt, connectionStatus],
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
