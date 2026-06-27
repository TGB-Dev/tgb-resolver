import {
  FILE_EXTENSION,
  type ShowFile,
  type ShowWebSocketMessage,
  toTimelineTableItems,
} from "@tgb-resolver/contracts";
import { atom, createStore } from "jotai";
import type { Getter, Setter } from "jotai/vanilla/typeUtils";

import {
  apiClient,
  createShowWebSocketManager,
  type ShowConnectionStatus,
  type ShowWebSocketManager,
} from "@/lib/api";

export const appStore = createStore();

const initialControlState = {
  show: null as ShowFile | null,
  loading: false,
  error: null as string | null,
  connectionStatus: "idle" as ShowConnectionStatus,
  canMutate: false,
  isResyncing: false,
  lastConnectedAt: undefined as number | undefined,
  lastDisconnectedAt: undefined as number | undefined,
  reconnectAttempt: 0,
};

export const controlShowAtom = atom<ShowFile | null>(initialControlState.show);
export const controlLoadingAtom = atom(initialControlState.loading);
export const controlErrorAtom = atom<string | null>(initialControlState.error);
export const controlConnectionStatusAtom = atom<ShowConnectionStatus>(
  initialControlState.connectionStatus,
);
export const controlCanMutateAtom = atom(initialControlState.canMutate);
export const controlIsResyncingAtom = atom(initialControlState.isResyncing);
export const controlLastConnectedAtAtom = atom<number | undefined>(
  initialControlState.lastConnectedAt,
);
export const controlLastDisconnectedAtAtom = atom<number | undefined>(
  initialControlState.lastDisconnectedAt,
);
export const controlReconnectAttemptAtom = atom(initialControlState.reconnectAttempt);

export const controlRowsAtom = atom((get) => deriveRows(get(controlShowAtom)));
export const controlIsLiveAtom = atom((get) => get(controlShowAtom)?.mode === "live");
export const controlCurrentEventIdAtom = atom(
  (get) => get(controlShowAtom)?.playback.currentEventId,
);

let socketManager: ShowWebSocketManager | null = null;
let connectPromise: Promise<void> | null = null;
let refetchPromise: Promise<void> | null = null;
let queuedRefetchVersion: number | null = null;

function deriveRows(show: ShowFile | null) {
  return show ? toTimelineTableItems(show) : [];
}

function setShowState(set: Setter, show: ShowFile) {
  set(controlShowAtom, show);
  set(controlLoadingAtom, false);
  set(controlErrorAtom, null);
}

function ensureMutableConnection(canMutate: boolean) {
  if (!canMutate) {
    throw new Error("Control connection is offline");
  }
}

async function refetchShow(get: Getter, set: Setter) {
  if (refetchPromise) {
    return refetchPromise;
  }

  set(controlLoadingAtom, true);
  set(controlIsResyncingAtom, true);
  set(controlCanMutateAtom, false);
  set(controlErrorAtom, null);

  refetchPromise = (async () => {
    try {
      const response = await apiClient.show.get();
      if (response.error) {
        throw new Error("Failed to load show");
      }

      setShowState(set, response.data);
      set(controlIsResyncingAtom, false);
      set(controlCanMutateAtom, get(controlConnectionStatusAtom) === "connected");
      set(controlReconnectAttemptAtom, 0);
    } catch (error) {
      set(controlLoadingAtom, false);
      set(controlIsResyncingAtom, false);
      set(controlCanMutateAtom, false);
      set(controlErrorAtom, error instanceof Error ? error.message : "Failed to load show");
    } finally {
      refetchPromise = null;
      const nextQueuedVersion = queuedRefetchVersion;
      queuedRefetchVersion = null;
      if (
        nextQueuedVersion !== null &&
        nextQueuedVersion > (get(controlShowAtom)?.showVersion ?? 0)
      ) {
        await refetchShow(get, set);
      }
    }
  })();

  return refetchPromise;
}

function queueRefetch(get: Getter, set: Setter, showVersion: number) {
  if (refetchPromise) {
    queuedRefetchVersion = Math.max(queuedRefetchVersion ?? 0, showVersion);
    return refetchPromise;
  }

  if (showVersion <= (get(controlShowAtom)?.showVersion ?? 0)) {
    return Promise.resolve();
  }

  return refetchShow(get, set);
}

function getOrCreateSocketManager(get: Getter, set: Setter) {
  if (socketManager) {
    return socketManager;
  }

  socketManager = createShowWebSocketManager({
    onOpen: async (attempt) => {
      set(controlConnectionStatusAtom, "connected");
      set(controlLastConnectedAtAtom, Date.now());
      set(controlReconnectAttemptAtom, attempt);
      set(controlErrorAtom, null);
      await refetchShow(get, set);
    },
    onClose: (nextStatus, attempt) => {
      set(controlConnectionStatusAtom, nextStatus);
      set(controlCanMutateAtom, false);
      set(controlIsResyncingAtom, nextStatus === "reconnecting");
      set(controlLastDisconnectedAtAtom, Date.now());
      set(controlReconnectAttemptAtom, attempt);
    },
    onError: (attempt) => {
      set(controlReconnectAttemptAtom, attempt);
    },
    onMessage: async (message) => {
      await appStore.set(applyWebSocketMessageAtom, message);
    },
  });

  return socketManager;
}

export const loadControlShowAtom = atom(null, async (get, set) => {
  await refetchShow(get, set);
});

export const connectControlAtom = atom(null, async (get, set) => {
  if (connectPromise) return connectPromise;
  if (get(controlConnectionStatusAtom) === "connected") return;

  if (get(controlConnectionStatusAtom) === "idle") {
    set(controlConnectionStatusAtom, "connecting");
  }

  connectPromise = getOrCreateSocketManager(get, set)
    .connect()
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
});

export const disconnectControlAtom = atom(null, (_get, set) => {
  socketManager?.disconnect();
  connectPromise = null;
  refetchPromise = null;
  queuedRefetchVersion = null;
  set(controlConnectionStatusAtom, "disconnected");
  set(controlCanMutateAtom, false);
  set(controlIsResyncingAtom, false);
  set(controlLastDisconnectedAtAtom, Date.now());
});

export const reconnectControlNowAtom = atom(null, async (get, set) => {
  set(controlConnectionStatusAtom, "reconnecting");
  set(controlCanMutateAtom, false);
  set(controlIsResyncingAtom, true);
  await getOrCreateSocketManager(get, set).reconnectNow();
});

export const optimizeCurrentShowAtom = atom(null, async (get, set) => {
  ensureMutableConnection(get(controlCanMutateAtom));
  const show = get(controlShowAtom);
  if (!show) return;
  const response = await apiClient.show.optimize.post({ showVersion: show.showVersion });
  if (response.error) throw new Error("Optimize failed");
  setShowState(set, response.data);
  set(controlCanMutateAtom, get(controlConnectionStatusAtom) === "connected");
});

export const clearCurrentShowAtom = atom(null, async (get, set) => {
  ensureMutableConnection(get(controlCanMutateAtom));
  const show = get(controlShowAtom);
  if (!show) return;
  const response = await apiClient.show.clear.post({ showVersion: show.showVersion });
  if (response.error) throw new Error("Clear failed");
  setShowState(set, response.data);
  set(controlCanMutateAtom, get(controlConnectionStatusAtom) === "connected");
});

export const importShowFileAtom = atom(null, async (get, set, file: File) => {
  ensureMutableConnection(get(controlCanMutateAtom));
  set(controlLoadingAtom, true);
  set(controlErrorAtom, null);

  try {
    const fileName = file.name.toLowerCase();
    const response = fileName.endsWith(".xml")
      ? await apiClient.show.import.xml.post({ xml: await file.text() })
      : fileName.endsWith(FILE_EXTENSION)
        ? await apiClient.show.import.bundle.post({
            bytes: arrayBufferToBase64(await file.arrayBuffer()),
          })
        : null;

    if (!response) {
      throw new Error(`Unsupported file format: ${file.name}`);
    }

    if (response.error) {
      throw new Error("Failed to import show file");
    }

    setShowState(set, response.data);
    set(controlCanMutateAtom, get(controlConnectionStatusAtom) === "connected");
  } catch (error) {
    set(controlErrorAtom, error instanceof Error ? error.message : "Failed to import show file");
    set(controlLoadingAtom, false);
  }
});

export const exportCurrentShowAtom = atom(null, async (get) => {
  ensureMutableConnection(get(controlCanMutateAtom));
  const response = await apiClient.show.export.bundle.get();
  if (response.error) throw new Error("Export failed");

  const blob = new Blob([response.data as BlobPart], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `show${FILE_EXTENSION}`;
  anchor.click();
  URL.revokeObjectURL(url);
});

export const renameControlEventAtom = atom(
  null,
  async (get, set, payload: { eventId: number; type: string; customName: string }) => {
    ensureMutableConnection(get(controlCanMutateAtom));
    const show = get(controlShowAtom);
    if (!show) return;

    const normalizedCustomName = payload.customName.trim();
    const response =
      payload.type === "RES"
        ? await apiClient.show.events.resolve({ id: String(payload.eventId) }).patch({
            showVersion: show.showVersion,
            customName: normalizedCustomName,
          })
        : await apiClient.show.events["non-resolve"]({ id: String(payload.eventId) }).patch({
            showVersion: show.showVersion,
            customName: normalizedCustomName,
          });

    if (response.error) throw new Error("Rename failed");
    setShowState(set, response.data);
    set(controlCanMutateAtom, get(controlConnectionStatusAtom) === "connected");
  },
);

export const applyWebSocketMessageAtom = atom(
  null,
  async (get, set, message: ShowWebSocketMessage) => {
    if (get(controlConnectionStatusAtom) !== "connected") return;

    if (
      message.type === "show-refetch-required" ||
      message.type === "show-replaced" ||
      message.type === "live-mode-changed"
    ) {
      await queueRefetch(get, set, message.showVersion);
      return;
    }

    if (message.type === "playback-state-changed") {
      if (get(controlIsResyncingAtom)) return;

      const show = get(controlShowAtom);
      if (!show) {
        await refetchShow(get, set);
        return;
      }

      if (message.showVersion <= show.showVersion) {
        return;
      }

      set(controlShowAtom, {
        ...show,
        showVersion: message.showVersion,
        playback: message.playback,
      });
    }
  },
);

export const toggleControlLiveModeAtom = atom(null, async (get, set) => {
  ensureMutableConnection(get(controlCanMutateAtom));
  const show = get(controlShowAtom);
  if (!show) return;

  const response =
    show.mode === "live" ? await apiClient.show.live.delete() : await apiClient.show.live.post();
  if (response.error) throw new Error("Failed to set live mode");
  setShowState(set, response.data);
  set(controlCanMutateAtom, get(controlConnectionStatusAtom) === "connected");
});

export function resetControlStateForTests() {
  socketManager = null;
  connectPromise = null;
  refetchPromise = null;
  queuedRefetchVersion = null;

  appStore.set(controlShowAtom, initialControlState.show);
  appStore.set(controlLoadingAtom, initialControlState.loading);
  appStore.set(controlErrorAtom, initialControlState.error);
  appStore.set(controlConnectionStatusAtom, initialControlState.connectionStatus);
  appStore.set(controlCanMutateAtom, initialControlState.canMutate);
  appStore.set(controlIsResyncingAtom, initialControlState.isResyncing);
  appStore.set(controlLastConnectedAtAtom, initialControlState.lastConnectedAt);
  appStore.set(controlLastDisconnectedAtAtom, initialControlState.lastDisconnectedAt);
  appStore.set(controlReconnectAttemptAtom, initialControlState.reconnectAttempt);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
