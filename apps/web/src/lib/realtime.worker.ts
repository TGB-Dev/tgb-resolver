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
  HUB_AUTH_CLOSE_CODE,
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
let lastToken: string | undefined;

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
      void connectHub(lastUrl, lastToken, true);
    }
  }, delay);
}

type EnvelopePayload = NonNullable<DecodedEnvelope["payload"]>;
type ProtoTimelineEvent = NonNullable<
  Extract<EnvelopePayload, { case: "timelineEventAdded" }>["value"]["event"]
>;
type ProtoCustom = NonNullable<ProtoTimelineEvent["custom"]>;

function decodeCustomPayload(custom: ProtoCustom | undefined) {
  if (!custom) return undefined;
  return {
    extId: custom.extId,
    extPayload: custom.extPayloadJson.length
      ? (JSON.parse(new TextDecoder().decode(custom.extPayloadJson)) as Record<string, unknown>)
      : undefined,
  };
}

function toTimelineWire(event: ProtoTimelineEvent | undefined | null) {
  return {
    id: event?.id ?? 0,
    position: event?.position ?? 0,
    type: event?.type ?? "",
    durationSeconds: event?.durationSeconds,
    triggerOffsetSeconds: event?.triggerOffsetSeconds,
    requireManualInteraction: event?.requireManualInteraction,
    customName: event?.customName,
    resolve: event?.resolve ? { ...event.resolve } : undefined,
    pre: event?.pre ? { ...event.pre } : undefined,
    custom: decodeCustomPayload(event?.custom),
  };
}

function postEnvelopeMessage(message: Record<string, unknown>) {
  post({ type: RealtimeWorkerResponseType.Message, message });
}

function postTimelineEventMessage(
  type: ShowMessageType.TimelineEventAdded | ShowMessageType.TimelineEventUpdated,
  showVersion: number,
  event: ProtoTimelineEvent | undefined | null,
) {
  postEnvelopeMessage({ type, showVersion, event: mapTimelineEvent(toTimelineWire(event)) });
}

function handleAdded(payload: EnvelopePayload) {
  if (payload.case !== "timelineEventAdded") return;
  postTimelineEventMessage(
    ShowMessageType.TimelineEventAdded,
    payload.value.showVersion,
    payload.value.event,
  );
}

function handleUpdated(payload: EnvelopePayload) {
  if (payload.case !== "timelineEventUpdated") return;
  postTimelineEventMessage(
    ShowMessageType.TimelineEventUpdated,
    payload.value.showVersion,
    payload.value.event,
  );
}

function handleRemoved(payload: EnvelopePayload) {
  if (payload.case !== "timelineEventRemoved") return;
  postEnvelopeMessage({
    type: ShowMessageType.TimelineEventRemoved,
    showVersion: payload.value.showVersion,
    eventId: payload.value.eventId,
  });
}

function handleReordered(payload: EnvelopePayload) {
  if (payload.case !== "timelineReordered") return;
  postEnvelopeMessage({
    type: ShowMessageType.TimelineReordered,
    showVersion: payload.value.showVersion,
    orderedEventIds: payload.value.orderedEventIds,
  });
}

function handleReplaced(payload: EnvelopePayload) {
  if (payload.case !== "showReplaced") return;
  postEnvelopeMessage({
    type: ShowMessageType.ShowReplaced,
    showVersion: payload.value.showVersion,
  });
}

function handlePlaybackChanged(payload: EnvelopePayload) {
  if (payload.case !== "playbackStateChanged") return;
  const p = payload.value.playback;
  postEnvelopeMessage({
    type: ShowMessageType.PlaybackStateChanged,
    showVersion: payload.value.showVersion,
    playback: {
      status: mapStatus(p?.status ?? ""),
      currentEventId: p?.currentEventId ?? undefined,
      activeEventIds: p?.activeEventIds ?? [],
      startedAt: p?.startedAtUnixMs != null ? Number(p.startedAtUnixMs) : undefined,
    },
  });
}

function handleLiveModeChanged(payload: EnvelopePayload) {
  if (payload.case !== "liveModeChanged") return;
  postEnvelopeMessage({
    type: ShowMessageType.LiveModeChanged,
    showVersion: payload.value.showVersion,
    mode: mapMode(payload.value.mode),
  });
}

function dispatchEnvelopeMessage(mapped: ShowMessageType, payload: EnvelopePayload) {
  switch (mapped) {
    case ShowMessageType.TimelineEventAdded:
      handleAdded(payload);
      break;
    case ShowMessageType.TimelineEventUpdated:
      handleUpdated(payload);
      break;
    case ShowMessageType.TimelineEventRemoved:
      handleRemoved(payload);
      break;
    case ShowMessageType.TimelineReordered:
      handleReordered(payload);
      break;
    case ShowMessageType.ShowReplaced:
      handleReplaced(payload);
      break;
    case ShowMessageType.PlaybackStateChanged:
      handlePlaybackChanged(payload);
      break;
    case ShowMessageType.LiveModeChanged:
      handleLiveModeChanged(payload);
      break;
  }
}

function decodeEnvelopeSafe(data: ArrayBuffer): DecodedEnvelope | undefined {
  try {
    return decodeEnvelope(data);
  } catch {
    return undefined;
  }
}

function handleEnvelope(data: ArrayBuffer) {
  const envelope = decodeEnvelopeSafe(data);
  if (!envelope) return;
  const mapped = envelopeToMessageType(envelope.type);
  if (!mapped) return;
  const payload = envelope.payload;
  if (!payload || payload.case === undefined) return;
  dispatchEnvelopeMessage(mapped, payload);
}

async function connectHub(url: string, token?: string, isReconnect = false) {
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
  lastToken = token;
  clearReconnectTimer();

  post({
    type: RealtimeWorkerResponseType.Status,
    status: isReconnect ? "reconnecting" : "connecting",
    attempt: reconnectAttempt,
  });

  socket = connectShowHub(
    url,
    {
      onEnvelope: (_envelope: DecodedEnvelope) => undefined,
      onOpen: () => {
        console.log("[realtime.worker] WebSocket opened");
        const attempt = reconnectAttempt;
        reconnectAttempt = 0;
        void syncClock().then(() => startClockSync());
        post({
          type: RealtimeWorkerResponseType.Status,
          status: "connected",
          attempt,
        });
      },
      onClose: (event) => {
        console.log(
          `[realtime.worker] WebSocket closed: code=${event.code} reason=${event.reason}`,
        );
        stopClockSync();
        if (event.code === HUB_AUTH_CLOSE_CODE) {
          manualStopInProgress = true;
          lastUrl = null;
          lastToken = undefined;
          post({ type: RealtimeWorkerResponseType.AuthExpired });
          return;
        }
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
        console.error("[realtime.worker] WebSocket error");
        post({
          type: RealtimeWorkerResponseType.Error,
          error: "hub connection error",
          attempt: reconnectAttempt,
        });
      },
    },
    token,
  );

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
        await connectHub(data.url as string, data.token as string | undefined);
        break;
      }
      case RealtimeWorkerRequestType.Disconnect: {
        await disconnectHub();
        break;
      }
      case RealtimeWorkerRequestType.ReconnectNow: {
        await connectHub(data.url as string, data.token as string | undefined);
        break;
      }
    }
  } catch (error) {
    reportFailed(error);
  }
};
