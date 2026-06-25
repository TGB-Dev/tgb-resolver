import { treaty } from "@elysia/eden";
import { FILE_EXTENSION, type ShowWebSocketMessage } from "@tgb-resolver/contracts";
import type { App } from "@tgb-resolver/server";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;

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
  onError: (attempt: number) => void;
  onMessage: (message: ShowWebSocketMessage) => void | Promise<void>;
}

export interface ShowWebSocketManager {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnectNow: () => Promise<void>;
}

export const apiClient = treaty<App>(API_BASE_URL);

function computeReconnectDelay(attempt: number) {
  const exponentialDelay = Math.min(
    MAX_RECONNECT_DELAY_MS,
    BASE_RECONNECT_DELAY_MS * 2 ** Math.max(0, attempt - 1),
  );
  const jitter = Math.floor(Math.random() * 250);
  return exponentialDelay + jitter;
}

export function createShowWebSocketManager(
  callbacks: ShowWebSocketManagerCallbacks,
): ShowWebSocketManager {
  let socket: WebSocket | null = null;
  let connectPromise: Promise<void> | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempt = 0;
  let intentionallyDisconnected = false;

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function closeSocket() {
    if (!socket) return;
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
    socket = null;
  }

  function scheduleReconnect() {
    if (intentionallyDisconnected) return;
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      callbacks.onClose("failed", reconnectAttempt);
      return;
    }

    reconnectAttempt += 1;
    const attempt = reconnectAttempt;
    callbacks.onClose("reconnecting", attempt);
    clearReconnectTimer();
    reconnectTimer = window.setTimeout(() => {
      void openSocket();
    }, computeReconnectDelay(attempt));
  }

  async function openSocket() {
    if (connectPromise) return connectPromise;
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    intentionallyDisconnected = false;
    const currentAttempt = reconnectAttempt;

    connectPromise = new Promise<void>((resolve) => {
      const nextSocket = new WebSocket(`${WS_BASE_URL}/ws`);
      socket = nextSocket;

      nextSocket.onopen = async () => {
        reconnectAttempt = 0;
        clearReconnectTimer();
        connectPromise = null;
        await callbacks.onOpen(currentAttempt);
        resolve();
      };

      nextSocket.onerror = () => {
        callbacks.onError(currentAttempt);
      };

      nextSocket.onmessage = async (event) => {
        await callbacks.onMessage(JSON.parse(event.data) as ShowWebSocketMessage);
      };

      nextSocket.onclose = () => {
        socket = null;
        connectPromise = null;

        if (intentionallyDisconnected) {
          callbacks.onClose("disconnected", reconnectAttempt);
          resolve();
          return;
        }

        scheduleReconnect();
        resolve();
      };
    });

    return connectPromise;
  }

  return {
    connect: async () => {
      await openSocket();
    },
    disconnect: () => {
      intentionallyDisconnected = true;
      reconnectAttempt = 0;
      clearReconnectTimer();
      closeSocket();
      callbacks.onClose("disconnected", 0);
      connectPromise = null;
    },
    reconnectNow: async () => {
      intentionallyDisconnected = false;
      clearReconnectTimer();
      closeSocket();
      reconnectAttempt = 0;
      await openSocket();
    },
  };
}

export { FILE_EXTENSION };
