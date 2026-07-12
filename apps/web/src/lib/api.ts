import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import { generatedClient, PlaybackStatus, ShowMode } from "@tgb-resolver/contracts";
import type { ShowPlaybackState, ShowWebSocketMessage } from "@tgb-resolver/realtime";
import {
  calculateClockSample,
  projectServerNow,
  selectClockEstimate,
} from "@tgb-resolver/realtime";
import type { ClockSyncRequest, IShowHubClient } from "@tgb-resolver/realtime/signalr";
import { getHubProxyFactory, getReceiverRegister } from "@tgb-resolver/realtime/signalr";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const MAX_RECONNECT_ATTEMPTS = 8;
const CLOCK_SYNC_INTERVAL_MS = 10_000;

let serverClockAtSyncMs = Date.now();
let monotonicAtSyncMs = performance.now();

export function getServerNow(): number {
  return projectServerNow(serverClockAtSyncMs, monotonicAtSyncMs, performance.now());
}

generatedClient.setConfig({
  baseUrl: API_BASE_URL,
});

export const apiClient = {
  get: () => Promise.resolve({ data: "TGB Resolver Server", error: undefined }),
};

function toShowPlaybackState(
  status: string,
  executionSequence: number,
  currentResolveEventId: number | undefined,
  currentEventId: number | undefined,
  activeSegment:
    | {
        ResolveEventId: number;
        NextResolveEventId?: number;
        InlineEventIds: number[];
        CurrentInlineIndex: number;
      }
    | undefined,
  startedAt: number | undefined,
): ShowPlaybackState {
  return {
    status:
      status === PlaybackStatus.RUNNING
        ? PlaybackStatus.RUNNING
        : status === PlaybackStatus.PAUSED
          ? PlaybackStatus.PAUSED
          : PlaybackStatus.IDLE,
    executionSequence,
    currentResolveEventId: currentResolveEventId ?? undefined,
    currentEventId: currentEventId ?? undefined,
    activeSegment: activeSegment
      ? {
          resolveEventId: activeSegment.ResolveEventId,
          nextResolveEventId: activeSegment.NextResolveEventId ?? undefined,
          inlineEventIds: activeSegment.InlineEventIds,
          currentInlineIndex: activeSegment.CurrentInlineIndex,
        }
      : undefined,
    startedAt: startedAt ?? undefined,
  };
}

function createClockSyncRequest(): ClockSyncRequest {
  return {
    SessionId: crypto.randomUUID(),
    ClientSentAtUnixMs: Date.now(),
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
  let clockSyncTimer: ReturnType<typeof setInterval> | null = null;

  const connection = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/show`)
    .withHubProtocol(new MessagePackHubProtocol())
    .withAutomaticReconnect([0, 500, 1_000, 2_000, 4_000, 8_000, 10_000, 10_000])
    .configureLogging(LogLevel.Error)
    .build();

  const hubProxy = getHubProxyFactory("IShowHub").createHubProxy(connection);

  getReceiverRegister("IShowHubClient").register(connection, {
    showRefetchRequired: async (message) => {
      await callbacks.onMessage({
        type: "show-refetch-required",
        showVersion: message.ShowVersion,
        reason: message.Reason,
      });
    },
    playbackStateChanged: async (message) => {
      await callbacks.onMessage({
        type: "playback-state-changed",
        showVersion: message.ShowVersion,
        playback: toShowPlaybackState(
          message.Playback.Status,
          message.Playback.ExecutionSequence,
          message.Playback.CurrentResolveEventId,
          message.Playback.CurrentEventId,
          message.Playback.ActiveSegment,
          message.Playback.StartedAt,
        ),
      });
    },
    liveModeChanged: async (message) => {
      await callbacks.onMessage({
        type: "live-mode-changed",
        showVersion: message.ShowVersion,
        mode: String(message.Mode) === "Live" ? ShowMode.LIVE : ShowMode.EDITING,
      });
    },
  } satisfies IShowHubClient);

  async function syncClock() {
    const samples = [];
    for (let index = 0; index < 8; index += 1) {
      const clientSentAtMonotonicMs = performance.now();
      const response = await hubProxy.syncClock(createClockSyncRequest());
      samples.push(
        calculateClockSample(
          {
            sessionId: response.SessionId,
            clientSentAtUnixMs: response.ClientSentAtUnixMs,
            serverReceivedAtUnixMs: response.ServerReceivedAtUnixMs,
            serverTransmittedAtUnixMs: response.ServerTransmittedAtUnixMs,
          },
          clientSentAtMonotonicMs,
          performance.now(),
        ),
      );
    }

    const estimate = selectClockEstimate(samples, performance.now());
    if (estimate) {
      serverClockAtSyncMs = estimate.serverNowMs;
      monotonicAtSyncMs = estimate.clientReceivedAtMonotonicMs;
    }

    return estimate;
  }

  function startClockSync() {
    if (clockSyncTimer) {
      clearInterval(clockSyncTimer);
    }

    clockSyncTimer = setInterval(() => {
      void syncClock().catch((error) => callbacks.onError(reconnectAttempt, error));
    }, CLOCK_SYNC_INTERVAL_MS);
  }

  function stopClockSync() {
    if (clockSyncTimer) {
      clearInterval(clockSyncTimer);
      clockSyncTimer = null;
    }
  }

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
    startClockSync();
    await callbacks.onOpen(attempt);
  });

  connection.onclose((error) => {
    stopClockSync();
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
          startClockSync();
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
              startClockSync();
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
