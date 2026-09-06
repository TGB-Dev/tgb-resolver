import {
  RealtimeWorkerRequestType,
  RealtimeWorkerResponseType,
  ShowConnectionStatus,
  type ShowWebSocketMessage,
} from "@tgb-resolver/realtime";

import RealtimeWorker from "@/lib/realtime.worker?worker";
import { API_BASE_URL } from "@/lib/runtime-config";
import { getServerNow, updateServerClock } from "@/lib/server-clock";

export { getServerNow, ShowConnectionStatus };

export interface RealtimeClientCallbacks {
  onMessage: (message: ShowWebSocketMessage) => void;
  onError: (attempt: number, error: unknown) => void;
}

export interface RealtimeClient {
  readonly connectionStatus: ShowConnectionStatus;
  readonly reconnectAttempt: number;

  connect(): Promise<void>;

  disconnect(): void;

  onStatusChange(listener: (status: ShowConnectionStatus, attempt: number) => void): () => void;
}

export function createRealtimeClient(
  baseUrl: string,
  callbacks: RealtimeClientCallbacks,
  worker: Worker,
): RealtimeClient {
  let connectionStatus: ShowConnectionStatus = ShowConnectionStatus.Idle;
  let reconnectAttempt = 0;
  let statusChangeListeners: Array<(status: ShowConnectionStatus, attempt: number) => void> = [];

  let workerDestroyed = false;

  function notifyStatus(status: ShowConnectionStatus, attempt: number) {
    connectionStatus = status;
    reconnectAttempt = attempt;
    for (const listener of statusChangeListeners) {
      listener(status, attempt);
    }
  }

  function onStatusChange(listener: (status: ShowConnectionStatus, attempt: number) => void) {
    statusChangeListeners.push(listener);
    return () => {
      statusChangeListeners = statusChangeListeners.filter((l) => l !== listener);
    };
  }

  worker.onmessage = (event: MessageEvent) => {
    const data = event.data as { type: string; [key: string]: unknown };

    switch (data.type) {
      case RealtimeWorkerResponseType.Status: {
        notifyStatus(data.status as ShowConnectionStatus, (data.attempt as number) ?? 0);
        break;
      }
      case RealtimeWorkerResponseType.Message: {
        callbacks.onMessage(data.message as ShowWebSocketMessage);
        break;
      }
      case RealtimeWorkerResponseType.ServerNow: {
        updateServerClock(data.serverClockAtSyncMs as number, data.monotonicAtSyncMs as number);
        break;
      }
      case RealtimeWorkerResponseType.Error: {
        callbacks.onError(reconnectAttempt, new Error(data.error as string));
        break;
      }
    }
  };

  worker.onerror = (event) => {
    event.preventDefault();
    const error = event.error ?? new Error(event.message ?? "Worker error");
    notifyStatus(ShowConnectionStatus.Failed, reconnectAttempt);
    callbacks.onError(reconnectAttempt, error);
  };

  function postToWorker(data: Record<string, unknown>) {
    worker.postMessage(data);
  }

  function waitForConnection(): Promise<void> {
    if (connectionStatus === ShowConnectionStatus.Connected) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const unsub = onStatusChange((status) => {
        if (workerDestroyed) {
          unsub();
          reject(new Error("Worker destroyed"));
          return;
        }
        if (status === ShowConnectionStatus.Connected) {
          unsub();
          resolve();
        } else if (status === ShowConnectionStatus.Failed) {
          unsub();
          reject(new Error("Connection failed"));
        }
      });
    });
  }

  return {
    get connectionStatus() {
      return connectionStatus;
    },
    get reconnectAttempt() {
      return reconnectAttempt;
    },
    onStatusChange,

    connect: async () => {
      if (connectionStatus === ShowConnectionStatus.Connected) {
        return;
      }

      notifyStatus(ShowConnectionStatus.Connecting, reconnectAttempt);
      postToWorker({
        type: RealtimeWorkerRequestType.Connect,
        url: baseUrl,
      });

      await waitForConnection();
    },

    disconnect: () => {
      if (connectionStatus === ShowConnectionStatus.Disconnected) {
        return;
      }

      notifyStatus(ShowConnectionStatus.Disconnected, reconnectAttempt);
      postToWorker({ type: RealtimeWorkerRequestType.Disconnect });
      workerDestroyed = true;
      worker.terminate();
    },
  };
}

// --- Module-level shared connection (singleton) -----------------------------

const STRICT_MODE_DISCONNECT_DELAY_MS = 250;

interface RealtimeListener {
  onStatusChange: (status: ShowConnectionStatus, attempt: number) => void;
  onMessage: (message: ShowWebSocketMessage) => void;
  onError: (attempt: number, error: unknown) => void;
}

const realtimeListeners = new Set<RealtimeListener>();
let sharedConnectionStatus: ShowConnectionStatus = ShowConnectionStatus.Connecting;
let sharedReconnectAttempt = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

let sharedClient: RealtimeClient | undefined;

function getSharedClient(): RealtimeClient {
  if (!sharedClient) {
    sharedClient = createRealtimeClient(
      API_BASE_URL,
      {
        onMessage: async (message) => {
          await Promise.all(
            Array.from(realtimeListeners, (listener) => listener.onMessage(message)),
          );
        },
        onError: (attempt, error) => {
          sharedReconnectAttempt = attempt;
          for (const listener of realtimeListeners) listener.onError(attempt, error);
        },
      },
      new RealtimeWorker(),
    );

    sharedClient.onStatusChange((status, attempt) => {
      sharedConnectionStatus = status;
      sharedReconnectAttempt = attempt;
      for (const listener of realtimeListeners) listener.onStatusChange(status, attempt);
    });
  }

  return sharedClient;
}

/** Subscribe to realtime status + messages. Returns an unsubscribe function. */
export function connectRealtime(
  onStatusChange: (status: ShowConnectionStatus, attempt: number) => void,
  onMessage: (message: ShowWebSocketMessage) => void,
  onError: (attempt: number, error: unknown) => void = (_attempt, error) => {
    if (error) console.error("Show hub connection error", error);
  },
): () => void {
  const listener: RealtimeListener = { onStatusChange, onMessage, onError };
  realtimeListeners.add(listener);
  onStatusChange(sharedConnectionStatus, sharedReconnectAttempt);

  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  void getSharedClient()
    .connect()
    .catch((error) => {
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
        void sharedClient?.disconnect();
      }
    }, STRICT_MODE_DISCONNECT_DELAY_MS);
  };
}
