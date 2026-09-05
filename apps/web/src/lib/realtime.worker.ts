/// <reference lib="webworker" />

import { fromBinary } from "@bufbuild/protobuf";
import {
  ClockSyncResponseSchema,
  calculateClockSample,
  clockResponseToMessage,
  connectShowHub,
  type DecodedEnvelope,
  decodeEnvelope,
  encodeClockSyncRequest,
  envelopeToMessageType,
  RealtimeWorkerRequestType,
  RealtimeWorkerResponseType,
  ShowMessageType,
  selectRobustEstimate,
} from "@tgb-resolver/realtime";
import { Effect, Fiber, Schedule } from "effect";

import { mapMode, mapStatus, mapTimelineEvent } from "@/lib/show-message-mapper";

const MAX_RECONNECT_ATTEMPTS = 8;
const CLOCK_SYNC_SAMPLES = 5;
const RECONNECT_DELAYS = [0, 500, 1_000, 2_000, 4_000, 8_000, 10_000, 10_000];

let socket: WebSocket | null = null;
let reconnectAttempt = 0;
let manualStopInProgress = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let clockSyncFiber: ReturnType<typeof Effect.runFork> | null = null;
let lastUrl: string | null = null;

function post(data: Record<string, unknown>) {
  self.postMessage(data);
}

function sendBinary(data: Uint8Array<ArrayBuffer>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      reject(new Error("hub not connected"));
      return;
    }
    socket.send(data);
    resolve();
  });
}

function awaitSyncResponse(): Promise<{
  clientTimeUnixMs: number;
  serverReceivedAtUnixMs: number;
  serverTransmittedAtUnixMs: number;
}> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("hub not connected"));
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      try {
        const decoded = fromBinary(ClockSyncResponseSchema, new Uint8Array(event.data));
        if (decoded.clientTimeUnixMs === BigInt(sentAt)) {
          socket?.removeEventListener("message", onMessage);
          resolve(clockResponseToMessage(decoded));
        }
      } catch {
        // Not a clock sync response; envelope frames are handled by the main listener.
      }
    };
    const sentAt = Date.now();
    socket.addEventListener("message", onMessage);
    sendBinary(encodeClockSyncRequest(sentAt)).catch((error: unknown) => {
      socket?.removeEventListener("message", onMessage);
      reject(error instanceof Error ? error : new Error(String(error)));
    });
    setTimeout(() => {
      socket?.removeEventListener("message", onMessage);
      reject(new Error("clock sync timed out"));
    }, 5_000);
  });
}

async function syncClock() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  const samples = [];
  for (let index = 0; index < CLOCK_SYNC_SAMPLES; index += 1) {
    const clientSentAtMonotonicMs = performance.now();
    try {
      const response = await awaitSyncResponse();
      samples.push(
        calculateClockSample(
          {
            sessionId: "",
            clientSentAtUnixMs: response.clientTimeUnixMs,
            serverReceivedAtUnixMs: response.serverReceivedAtUnixMs,
            serverTransmittedAtUnixMs: response.serverTransmittedAtUnixMs,
          },
          clientSentAtMonotonicMs,
          performance.now(),
        ),
      );
    } catch {
      return;
    }
  }

  const estimate = selectRobustEstimate(samples, performance.now(), 3, 200);
  if (estimate) {
    post({
      type: RealtimeWorkerResponseType.ServerNow,
      serverClockAtSyncMs: estimate.serverNowMs,
      monotonicAtSyncMs: estimate.clientReceivedAtMonotonicMs,
    });
  }
}

function startClockSync() {
  stopClockSync();
  clockSyncFiber = Effect.runFork(
    Effect.repeat(
      Effect.tryPromise({
        try: syncClock,
        catch: (error) => error,
      }).pipe(Effect.ignore),
      Schedule.fixed("5 seconds"),
    ),
  );
}

function stopClockSync() {
  if (clockSyncFiber !== null) {
    Effect.runFork(Fiber.interrupt(clockSyncFiber));
    clockSyncFiber = null;
  }
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function reportFailed(error: unknown) {
  post({
    type: RealtimeWorkerResponseType.Status,
    status: "failed",
    attempt: reconnectAttempt,
  });
  post({
    type: RealtimeWorkerResponseType.Error,
    error: String(error),
    attempt: reconnectAttempt,
  });
}

function scheduleReconnect() {
  if (manualStopInProgress || lastUrl === null) {
    return;
  }

  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    post({
      type: RealtimeWorkerResponseType.Status,
      status: "failed",
      attempt: reconnectAttempt,
    });
    return;
  }

  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (lastUrl !== null) {
      void connectHub(lastUrl, true);
    }
  }, delay);
}

function handleEnvelope(data: ArrayBuffer) {
  let envelope: DecodedEnvelope;
  try {
    envelope = decodeEnvelope(data);
  } catch {
    return;
  }

  const mapped = envelopeToMessageType(envelope.type);
  if (!mapped) return;
  const payload = envelope.payload;
  if (!payload || payload.case === undefined) return;

  switch (mapped) {
    case ShowMessageType.TimelineEventAdded: {
      if (payload.case !== "timelineEventAdded") return;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.TimelineEventAdded,
          showVersion: payload.value.showVersion,
          event: mapTimelineEvent({
            id: payload.value.event?.id ?? 0,
            position: payload.value.event?.position ?? 0,
            type: payload.value.event?.type ?? "",
            durationSeconds: payload.value.event?.durationSeconds,
            triggerOffsetSeconds: payload.value.event?.triggerOffsetSeconds,
            requireManualInteraction: payload.value.event?.requireManualInteraction,
            customName: payload.value.event?.customName,
            resolve: payload.value.event?.resolve ? { ...payload.value.event.resolve } : undefined,
            pre: payload.value.event?.pre ? { ...payload.value.event.pre } : undefined,
            custom: payload.value.event?.custom
              ? {
                  extId: payload.value.event.custom.extId,
                  extPayload: payload.value.event.custom.extPayloadJson.length
                    ? (JSON.parse(
                        new TextDecoder().decode(payload.value.event.custom.extPayloadJson),
                      ) as Record<string, unknown>)
                    : undefined,
                }
              : undefined,
          }),
        },
      });
      break;
    }
    case ShowMessageType.TimelineEventUpdated: {
      if (payload.case !== "timelineEventUpdated") return;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.TimelineEventUpdated,
          showVersion: payload.value.showVersion,
          event: mapTimelineEvent({
            id: payload.value.event?.id ?? 0,
            position: payload.value.event?.position ?? 0,
            type: payload.value.event?.type ?? "",
            durationSeconds: payload.value.event?.durationSeconds,
            triggerOffsetSeconds: payload.value.event?.triggerOffsetSeconds,
            requireManualInteraction: payload.value.event?.requireManualInteraction,
            customName: payload.value.event?.customName,
            resolve: payload.value.event?.resolve ? { ...payload.value.event.resolve } : undefined,
            pre: payload.value.event?.pre ? { ...payload.value.event.pre } : undefined,
            custom: payload.value.event?.custom
              ? {
                  extId: payload.value.event.custom.extId,
                  extPayload: payload.value.event.custom.extPayloadJson.length
                    ? (JSON.parse(
                        new TextDecoder().decode(payload.value.event.custom.extPayloadJson),
                      ) as Record<string, unknown>)
                    : undefined,
                }
              : undefined,
          }),
        },
      });
      break;
    }
    case ShowMessageType.TimelineEventRemoved: {
      if (payload.case !== "timelineEventRemoved") return;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.TimelineEventRemoved,
          showVersion: payload.value.showVersion,
          eventId: payload.value.eventId,
        },
      });
      break;
    }
    case ShowMessageType.TimelineReordered: {
      if (payload.case !== "timelineReordered") return;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.TimelineReordered,
          showVersion: payload.value.showVersion,
          orderedEventIds: payload.value.orderedEventIds,
        },
      });
      break;
    }
    case ShowMessageType.ShowReplaced: {
      if (payload.case !== "showReplaced") return;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.ShowReplaced,
          showVersion: payload.value.showVersion,
        },
      });
      break;
    }
    case ShowMessageType.PlaybackStateChanged: {
      if (payload.case !== "playbackStateChanged") return;
      const p = payload.value.playback;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.PlaybackStateChanged,
          showVersion: payload.value.showVersion,
          playback: {
            status: mapStatus(p?.status ?? ""),
            currentEventId: p?.currentEventId ?? undefined,
            activeEventIds: p?.activeEventIds ?? [],
            startedAt: p?.startedAtUnixMs != null ? Number(p.startedAtUnixMs) : undefined,
          },
        },
      });
      break;
    }
    case ShowMessageType.LiveModeChanged: {
      if (payload.case !== "liveModeChanged") return;
      post({
        type: RealtimeWorkerResponseType.Message,
        message: {
          type: ShowMessageType.LiveModeChanged,
          showVersion: payload.value.showVersion,
          mode: mapMode(payload.value.mode),
        },
      });
      break;
    }
  }
}

async function connectHub(url: string, isReconnect = false) {
  if (socket) {
    try {
      socket.close();
    } catch {
      // Ignore close errors; a fresh socket is created below.
    }
    socket = null;
  }

  if (!isReconnect) {
    manualStopInProgress = false;
    reconnectAttempt = 0;
  }
  lastUrl = url;
  clearReconnectTimer();

  post({
    type: RealtimeWorkerResponseType.Status,
    status: isReconnect ? "reconnecting" : "connecting",
    attempt: reconnectAttempt,
  });

  socket = connectShowHub(url, {
    onEnvelope: (_envelope: DecodedEnvelope) => undefined,
    onOpen: () => {
      const attempt = reconnectAttempt;
      reconnectAttempt = 0;
      void syncClock().then(() => startClockSync());
      post({
        type: RealtimeWorkerResponseType.Status,
        status: "connected",
        attempt,
      });
    },
    onClose: () => {
      stopClockSync();
      if (manualStopInProgress) {
        manualStopInProgress = false;
        post({
          type: RealtimeWorkerResponseType.Status,
          status: "disconnected",
          attempt: 0,
        });
        return;
      }
      reconnectAttempt = Math.min(reconnectAttempt + 1, MAX_RECONNECT_ATTEMPTS);
      post({
        type: RealtimeWorkerResponseType.Status,
        status: "reconnecting",
        attempt: reconnectAttempt,
      });
      scheduleReconnect();
    },
    onError: () => {
      post({
        type: RealtimeWorkerResponseType.Error,
        error: "hub connection error",
        attempt: reconnectAttempt,
      });
    },
  });

  const active = socket;
  active?.addEventListener("message", (event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      handleEnvelope(event.data);
    }
  });
}

async function disconnectHub() {
  reconnectAttempt = 0;
  manualStopInProgress = true;
  lastUrl = null;
  clearReconnectTimer();

  if (!socket || socket.readyState === WebSocket.CLOSED) {
    manualStopInProgress = false;
    post({
      type: RealtimeWorkerResponseType.Status,
      status: "disconnected",
      attempt: 0,
    });
    return;
  }

  stopClockSync();
  const active = socket;
  socket = null;
  active.close();
}

self.onmessage = async (event: MessageEvent) => {
  try {
    const data = event.data as { type: string; [key: string]: unknown };

    switch (data.type) {
      case RealtimeWorkerRequestType.Connect: {
        await connectHub(data.url as string);
        break;
      }
      case RealtimeWorkerRequestType.Disconnect: {
        await disconnectHub();
        break;
      }
      case RealtimeWorkerRequestType.ReconnectNow: {
        await connectHub(data.url as string);
        break;
      }
    }
  } catch (error) {
    reportFailed(error);
  }
};
