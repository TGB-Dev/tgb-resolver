import {
  projectServerNow,
  RealtimeWorkerRequestType,
  RealtimeWorkerResponseType,
  ShowConnectionStatus,
  type ShowWebSocketMessage,
} from "@tgb-resolver/realtime";

export { ShowConnectionStatus };

let serverClockAtSyncMs = Date.now();
let monotonicAtSyncMs = performance.now();

export function getServerNow(): number {
  return projectServerNow(serverClockAtSyncMs, monotonicAtSyncMs, performance.now());
}

export interface RealtimeClientCallbacks {
  onMessage: (message: ShowWebSocketMessage) => void;
  onError: (attempt: number, error: unknown) => void;
}

export interface RealtimeClient {
  connect(): Promise<void>;
  disconnect(): void;
  reconnectNow(): Promise<void>;
  readonly connectionStatus: ShowConnectionStatus;
  readonly reconnectAttempt: number;
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
        serverClockAtSyncMs = data.serverClockAtSyncMs as number;
        monotonicAtSyncMs = data.monotonicAtSyncMs as number;
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
        url: `${baseUrl}/hubs/show`,
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

    reconnectNow: async () => {
      notifyStatus(ShowConnectionStatus.Connecting, 0);
      postToWorker({
        type: RealtimeWorkerRequestType.ReconnectNow,
        url: `${baseUrl}/hubs/show`,
      });

      await waitForConnection();
    },
  };
}
