/// <reference lib="webworker" />

import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import {
  calculateClockSample,
  type LiveModeChangedMessage,
  type PlaybackStateChangedMessage,
  PlaybackStatus,
  RealtimeWorkerRequestType,
  RealtimeWorkerResponseType,
  ShowMessageType,
  ShowMode,
  type ShowReplacedMessage,
  selectClockEstimate,
  type TimelineEvent,
  type TimelineEventAddedMessage,
  type TimelineEventRemovedMessage,
  TimelineEventType,
  type TimelineEventUpdatedMessage,
  type TimelineReorderedMessage,
  VerdictRunResult,
} from "@tgb-resolver/realtime";
import { Effect, Fiber, Schedule } from "effect";

const MAX_RECONNECT_ATTEMPTS = 8;
const CLOCK_SYNC_SAMPLES = 8;

let connection: ReturnType<HubConnectionBuilder["build"]> | null = null;
let reconnectAttempt = 0;
let manualStopInProgress = false;
let clockSyncFiber: ReturnType<typeof Effect.runFork> | null = null;

function post(data: Record<string, unknown>) {
  self.postMessage(data);
}

async function syncClock() {
  if (!connection || connection.state !== HubConnectionState.Connected) {
    return;
  }

  const samples = [];
  for (let index = 0; index < CLOCK_SYNC_SAMPLES; index += 1) {
    const clientSentAtMonotonicMs = performance.now();
    const response = (await connection.invoke("SyncClock", {
      SessionId: crypto.randomUUID(),
      ClientSentAtUnixMs: Date.now(),
    })) as {
      SessionId: string;
      ClientSentAtUnixMs: number;
      ServerReceivedAtUnixMs: number;
      ServerTransmittedAtUnixMs: number;
    };
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
      Schedule.fixed("10 seconds"),
    ),
  );
}

function stopClockSync() {
  if (clockSyncFiber !== null) {
    Effect.runFork(Fiber.interrupt(clockSyncFiber));
    clockSyncFiber = null;
  }
}

function mapStatus(status: string): string {
  return status === PlaybackStatus.RUNNING
    ? PlaybackStatus.RUNNING
    : status === PlaybackStatus.PAUSED
      ? PlaybackStatus.PAUSED
      : PlaybackStatus.IDLE;
}

function mapMode(mode: string): ShowMode {
  return String(mode) === "Live" ? ShowMode.LIVE : ShowMode.EDITING;
}

async function connectHub(url: string) {
  if (connection) {
    await connection.stop();
  }

  manualStopInProgress = false;
  reconnectAttempt = 0;

  connection = new HubConnectionBuilder()
    .withUrl(url)
    .withHubProtocol(new MessagePackHubProtocol())
    .withAutomaticReconnect([0, 500, 1_000, 2_000, 4_000, 8_000, 10_000, 10_000])
    .configureLogging(LogLevel.Error)
    .build();

  function mapTimelineEvent(src: TimelineEventAddedMessage["Event"]): TimelineEvent {
    const base = {
      id: src.Id,
      position: src.Position,
      triggerOffsetSeconds: src.TriggerOffsetSeconds,
      requireManualInteraction: src.RequireManualInteraction,
      customName: src.CustomName,
    };

    switch (src.Type as string) {
      case TimelineEventType.RES: {
        const r = src.Resolve;
        if (!r) throw new Error("RES timeline event missing Resolve payload");
        return {
          ...base,
          type: TimelineEventType.RES,
          payload: {
            realName: r.RealName,
            username: r.Username,
            problem: r.Problem,
            newTotalScore: r.NewTotalScore,
            newRank: r.NewRank,
            newProblemScore: r.NewProblemScore,
            problemDisplayName: r.ProblemDisplayName,
            verdict: r.Verdict as unknown as VerdictRunResult,
          },
        };
      }
      case TimelineEventType.PRE: {
        const r = src.Pre;
        if (!r) throw new Error("PRE timeline event missing Pre payload");
        return {
          ...base,
          type: TimelineEventType.PRE,
          payload: {
            realName: r.RealName,
            username: r.Username,
            problem: r.Problem,
            newTotalScore: r.NewTotalScore,
            newRank: r.NewRank,
            newProblemScore: r.NewProblemScore,
            problemDisplayName: r.ProblemDisplayName,
            verdict: r.Verdict as unknown as VerdictRunResult,
          },
        };
      }
      case TimelineEventType.IMG: {
        const img = src.Image;
        if (!img) throw new Error("IMG timeline event missing Image payload");
        return {
          ...base,
          type: TimelineEventType.IMG,
          payload: {
            imageId: img.AssetId,
            durationSeconds: img.DurationSeconds,
          },
        };
      }
      case TimelineEventType.SFX: {
        const sfx = src.Sfx;
        if (!sfx) throw new Error("SFX timeline event missing Sfx payload");
        return {
          ...base,
          type: TimelineEventType.SFX,
          payload: {
            sfxId: sfx.AssetId,
            durationSeconds: sfx.DurationSeconds,
          },
        };
      }
      default:
        return {
          ...base,
          type: TimelineEventType.RES,
          payload: {
            realName: "",
            username: "",
            problem: "",
            newTotalScore: 0,
            newRank: 0,
            newProblemScore: 0,
            problemDisplayName: "",
            verdict: VerdictRunResult.UNKNOWN,
          },
        };
    }
  }

  connection.on("TimelineEventAdded", (message: TimelineEventAddedMessage) => {
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.TimelineEventAdded,
        showVersion: message.ShowVersion,
        event: mapTimelineEvent(message.Event),
      },
    });
  });

  connection.on("TimelineEventUpdated", (message: TimelineEventUpdatedMessage) => {
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.TimelineEventUpdated,
        showVersion: message.ShowVersion,
        event: mapTimelineEvent(message.Event),
      },
    });
  });

  connection.on("TimelineEventRemoved", (message: TimelineEventRemovedMessage) => {
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.TimelineEventRemoved,
        showVersion: message.ShowVersion,
        eventId: message.EventId,
      },
    });
  });

  connection.on("TimelineReordered", (message: TimelineReorderedMessage) => {
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.TimelineReordered,
        showVersion: message.ShowVersion,
        orderedEventIds: message.OrderedEventIds,
      },
    });
  });

  connection.on("ShowReplaced", (message: ShowReplacedMessage) => {
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.ShowReplaced,
        showVersion: message.ShowVersion,
      },
    });
  });

  connection.on("PlaybackStateChanged", (message: PlaybackStateChangedMessage) => {
    const p = message.Playback;
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.PlaybackStateChanged,
        showVersion: message.ShowVersion,
        playback: {
          status: mapStatus(p.Status),
          executionSequence: p.ExecutionSequence,
          currentResolveEventId: p.CurrentResolveEventId ?? undefined,
          currentEventId: p.CurrentEventId ?? undefined,
          activeSegment: p.ActiveSegment
            ? {
                resolveEventId: p.ActiveSegment.ResolveEventId,
                nextResolveEventId: p.ActiveSegment.NextResolveEventId ?? undefined,
                inlineEventIds: p.ActiveSegment.InlineEventIds,
                currentInlineIndex: p.ActiveSegment.CurrentInlineIndex,
              }
            : undefined,
          startedAt: p.StartedAt ?? undefined,
        },
      },
    });
  });

  connection.on("LiveModeChanged", (message: LiveModeChangedMessage) => {
    post({
      type: RealtimeWorkerResponseType.Message,
      message: {
        type: ShowMessageType.LiveModeChanged,
        showVersion: message.ShowVersion,
        mode: mapMode(message.Mode),
      },
    });
  });

  connection.onreconnecting((error) => {
    if (manualStopInProgress) {
      return;
    }

    reconnectAttempt = Math.min(reconnectAttempt + 1, MAX_RECONNECT_ATTEMPTS);
    post({
      type: RealtimeWorkerResponseType.Status,
      status: "reconnecting",
      attempt: reconnectAttempt,
    });
    if (error) {
      post({
        type: RealtimeWorkerResponseType.Error,
        error: String(error),
        attempt: reconnectAttempt,
      });
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
    post({
      type: RealtimeWorkerResponseType.Status,
      status: "connected",
      attempt,
    });
  });

  connection.onclose((error) => {
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

    const nextStatus = reconnectAttempt >= MAX_RECONNECT_ATTEMPTS ? "failed" : "disconnected";
    post({
      type: RealtimeWorkerResponseType.Status,
      status: nextStatus,
      attempt: reconnectAttempt,
    });
    if (error) {
      post({
        type: RealtimeWorkerResponseType.Error,
        error: String(error),
        attempt: reconnectAttempt,
      });
    }
  });

  try {
    await connection.start();
    await syncClock();
    startClockSync();
    post({
      type: RealtimeWorkerResponseType.Status,
      status: "connected",
      attempt: 0,
    });
  } catch (error) {
    if (manualStopInProgress) {
      return;
    }

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
}

async function disconnectHub() {
  reconnectAttempt = 0;
  manualStopInProgress = true;

  if (!connection || connection.state === HubConnectionState.Disconnected) {
    manualStopInProgress = false;
    post({
      type: RealtimeWorkerResponseType.Status,
      status: "disconnected",
      attempt: 0,
    });
    return;
  }

  stopClockSync();
  await connection.stop();
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
};
