import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import { generatedClient } from "@tgb-resolver/contracts";
import type {
  ClockSyncRequest,
  ClockSyncResponse,
  ShowPlaybackState,
  ShowWebSocketMessage,
} from "@tgb-resolver/realtime";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const MAX_RECONNECT_ATTEMPTS = 8;

generatedClient.setConfig({
  baseUrl: API_BASE_URL,
});

export const apiClient = {
  get: () => Promise.resolve({ data: "TGB Resolver Server", error: undefined }),
};

function normalizePlaybackStatus(status: string): ShowPlaybackState["status"] {
  switch (status) {
    case "Running":
      return "running";
    case "Paused":
      return "paused";
    case "Completed":
      return "completed";
    default:
      return "idle";
  }
}

function toShowPlaybackState(playback: {
  status: string;
  currentResolveEventId?: number | null;
  currentEventId?: number | null;
  activeSegment?: {
    resolveEventId: number;
    nextResolveEventId?: number | null;
    inlineEventIds: number[];
    currentInlineIndex: number;
  };
  startedAt?: number | null;
}): ShowPlaybackState {
  return {
    status: normalizePlaybackStatus(playback.status),
    currentResolveEventId: playback.currentResolveEventId ?? undefined,
    currentEventId: playback.currentEventId ?? undefined,
    activeSegment: playback.activeSegment
      ? {
          resolveEventId: playback.activeSegment.resolveEventId,
          nextResolveEventId: playback.activeSegment.nextResolveEventId ?? undefined,
          inlineEventIds: playback.activeSegment.inlineEventIds,
          currentInlineIndex: playback.activeSegment.currentInlineIndex,
        }
      : undefined,
    startedAt: playback.startedAt ?? undefined,
  };
}

function createClockSyncRequest(): ClockSyncRequest {
  return {
    sessionId: crypto.randomUUID(),
    clientSentAt: new Date().toISOString(),
  };
}

export type ShowConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed";

export interface ShowWebSocketManagerCallbacks {
  onOpen: (attempt: number) => void | Promise<void>;
  onClose: (
    nextStatus: Exclude<ShowConnectionStatus, "idle" | "connected">,
    attempt: number,
  ) => void;
  onError: (attempt: number, error?: unknown) => void;
  onMessage: (message: ShowWebSocketMessage) => void | Promise<void>;
}

export interface ShowWebSocketManager {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnectNow: () => Promise<void>;
}

export function createShowWebSocketManager(
  callbacks: ShowWebSocketManagerCallbacks,
): ShowWebSocketManager {
  if (import.meta.env.MODE === "test" || import.meta.env.VITEST) {
    return {
      connect: async () => {},
      disconnect: () => {
        callbacks.onClose("disconnected", 0);
      },
      reconnectNow: async () => {},
    };
  }

  let reconnectAttempt = 0;
  let manualStopInProgress = false;
  let connectPromise: Promise<void> | null = null;
  let stopPromise: Promise<void> | null = null;

  const connection = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/show`)
    .withHubProtocol(new MessagePackHubProtocol())
    .withAutomaticReconnect([0, 500, 1_000, 2_000, 4_000, 8_000, 10_000, 10_000])
    .configureLogging(LogLevel.Error)
    .build();

  async function syncClock() {
    await connection.invoke<ClockSyncResponse>("SyncClock", createClockSyncRequest());
  }

  connection.on("ShowRefetchRequired", async (message: { showVersion: number; reason: string }) => {
    await callbacks.onMessage({
      type: "show-refetch-required",
      showVersion: message.showVersion,
      reason:
        message.reason === "ShowReplaced"
          ? "show_replaced"
          : message.reason === "VersionDrift"
            ? "version_drift"
            : "optimized",
    });
  });

  connection.on(
    "PlaybackStateChanged",
    async (message: {
      showVersion: number;
      playback: {
        status: string;
        currentResolveEventId?: number;
        currentEventId?: number;
        activeSegment?: {
          resolveEventId: number;
          nextResolveEventId?: number;
          inlineEventIds: number[];
          currentInlineIndex: number;
        };
        startedAt?: number;
      };
    }) => {
      await callbacks.onMessage({
        type: "playback-state-changed",
        showVersion: message.showVersion,
        playback: toShowPlaybackState(message.playback),
      });
    },
  );

  connection.on("LiveModeChanged", async (message: { showVersion: number; mode: string }) => {
    await callbacks.onMessage({
      type: "live-mode-changed",
      showVersion: message.showVersion,
      mode: message.mode === "Live" ? "live" : "editing",
    });
  });

  connection.onreconnecting((error) => {
    if (manualStopInProgress) {
      return;
    }

    reconnectAttempt = Math.min(reconnectAttempt + 1, MAX_RECONNECT_ATTEMPTS);
    callbacks.onError(reconnectAttempt, error);
    callbacks.onClose("reconnecting", reconnectAttempt);
    if (error) {
      console.error(error);
    }
  });

  connection.onreconnected(async () => {
    if (manualStopInProgress) {
      return;
    }

    const attempt = reconnectAttempt;
    reconnectAttempt = 0;
    await syncClock();
    await callbacks.onOpen(attempt);
  });

  connection.onclose((error) => {
    connectPromise = null;
    stopPromise = null;

    if (manualStopInProgress) {
      manualStopInProgress = false;
      callbacks.onClose("disconnected", 0);
      return;
    }

    const nextStatus = reconnectAttempt >= MAX_RECONNECT_ATTEMPTS ? "failed" : "disconnected";
    callbacks.onClose(nextStatus, reconnectAttempt);
    if (error) {
      callbacks.onError(reconnectAttempt, error);
    }
  });

  return {
    connect: async () => {
      if (connection.state === HubConnectionState.Connected) {
        return;
      }

      if (connectPromise) {
        return connectPromise;
      }

      if (stopPromise) {
        await stopPromise;
      }

      if (connection.state !== HubConnectionState.Disconnected) {
        return;
      }

      manualStopInProgress = false;
      connectPromise = (async () => {
        try {
          await connection.start();
          await syncClock();
          await callbacks.onOpen(reconnectAttempt);
        } catch (error) {
          if (manualStopInProgress) {
            return;
          }

          callbacks.onError(reconnectAttempt, error);
          callbacks.onClose("failed", reconnectAttempt);
          throw error;
        } finally {
          connectPromise = null;
        }
      })();

      return connectPromise;
    },
    disconnect: () => {
      reconnectAttempt = 0;
      manualStopInProgress = true;

      if (connection.state === HubConnectionState.Disconnected) {
        manualStopInProgress = false;
        connectPromise = null;
        stopPromise = null;
        callbacks.onClose("disconnected", 0);
        return;
      }

      if (stopPromise) {
        return;
      }

      stopPromise = connection.stop().finally(() => {
        stopPromise = null;
      });
    },
    reconnectNow: async () => {
      reconnectAttempt = 0;
      if (connectPromise) {
        manualStopInProgress = true;
        await connectPromise.catch(() => {});
      }

      if (connection.state !== HubConnectionState.Disconnected) {
        manualStopInProgress = true;
        if (!stopPromise) {
          stopPromise = connection.stop().finally(() => {
            stopPromise = null;
          });
        }
        await stopPromise;
      }

      manualStopInProgress = false;
      await (connectPromise ??
        (async () => {
          connectPromise = (async () => {
            try {
              await connection.start();
              await syncClock();
              await callbacks.onOpen(0);
            } catch (error) {
              if (manualStopInProgress) {
                return;
              }

              callbacks.onError(reconnectAttempt, error);
              callbacks.onClose("failed", reconnectAttempt);
              throw error;
            } finally {
              connectPromise = null;
            }
          })();

          return connectPromise;
        })());
    },
  };
}
