import {
  FILE_EXTENSION,
  type ShowFile,
  type ShowWebSocketMessage,
  type TimelineTableItem,
  toTimelineTableItems,
} from "@tgb-resolver/contracts";
import { create } from "zustand";
import {
  apiClient,
  createShowWebSocketManager,
  type ShowConnectionStatus,
  type ShowWebSocketManager,
} from "@/lib/api";

interface ControlStore {
  show: ShowFile | null;
  loading: boolean;
  error: string | null;
  rows: TimelineTableItem[];
  connectionStatus: ShowConnectionStatus;
  canMutate: boolean;
  isResyncing: boolean;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  reconnectAttempt: number;
  loadShow: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnectNow: () => Promise<void>;
  optimizeCurrentShow: () => Promise<void>;
  clearCurrentShow: () => Promise<void>;
  importShowFile: (file: File) => Promise<void>;
  exportCurrentShow: () => Promise<void>;
  renameEvent: (
    eventId: number,
    type: TimelineTableItem["type"],
    customName: string,
  ) => Promise<void>;
  applyWebSocketMessage: (message: ShowWebSocketMessage) => Promise<void>;
  toggleLiveMode: () => Promise<void>;
}

function deriveRows(show: ShowFile | null) {
  return show ? toTimelineTableItems(show) : [];
}

function setShowState(show: ShowFile) {
  return {
    show,
    rows: deriveRows(show),
    loading: false,
    error: null,
  } satisfies Pick<ControlStore, "show" | "rows" | "loading" | "error">;
}

function ensureMutableConnection(canMutate: boolean) {
  if (!canMutate) {
    throw new Error("Control connection is offline");
  }
}

export const useControlStore = create<ControlStore>((set, get) => {
  let socketManager: ShowWebSocketManager | null = null;
  let connectPromise: Promise<void> | null = null;
  let refetchPromise: Promise<void> | null = null;
  let queuedRefetchVersion: number | null = null;

  async function refetchShow() {
    if (refetchPromise) return refetchPromise;

    set({ loading: true, isResyncing: true, canMutate: false, error: null });
    refetchPromise = (async () => {
      try {
        const response = await apiClient.show.get();
        if (response.error) {
          throw new Error("Failed to load show");
        }

        set({
          ...setShowState(response.data),
          isResyncing: false,
          canMutate: get().connectionStatus === "connected",
          reconnectAttempt: 0,
        });
      } catch (error) {
        set({
          loading: false,
          isResyncing: false,
          canMutate: false,
          error: error instanceof Error ? error.message : "Failed to load show",
        });
      } finally {
        refetchPromise = null;
        const nextQueuedVersion = queuedRefetchVersion;
        queuedRefetchVersion = null;
        if (nextQueuedVersion !== null && nextQueuedVersion > (get().show?.showVersion ?? 0)) {
          await refetchShow();
        }
      }
    })();

    return refetchPromise;
  }

  function queueRefetch(showVersion: number) {
    if (refetchPromise) {
      queuedRefetchVersion = Math.max(queuedRefetchVersion ?? 0, showVersion);
      return refetchPromise;
    }

    if (showVersion <= (get().show?.showVersion ?? 0)) {
      return Promise.resolve();
    }

    return refetchShow();
  }

  function getOrCreateSocketManager() {
    if (socketManager) return socketManager;

    socketManager = createShowWebSocketManager({
      onOpen: async (attempt) => {
        set({
          connectionStatus: "connected",
          lastConnectedAt: Date.now(),
          reconnectAttempt: attempt,
          error: null,
        });
        await refetchShow();
      },
      onClose: (nextStatus, attempt) => {
        set({
          connectionStatus: nextStatus,
          canMutate: false,
          isResyncing: nextStatus === "reconnecting",
          lastDisconnectedAt: Date.now(),
          reconnectAttempt: attempt,
        });
      },
      onError: (attempt) => {
        set({
          reconnectAttempt: attempt,
        });
      },
      onMessage: async (message) => {
        await get().applyWebSocketMessage(message);
      },
    });

    return socketManager;
  }

  return {
    show: null,
    loading: false,
    error: null,
    rows: [],
    connectionStatus: "idle",
    canMutate: false,
    isResyncing: false,
    lastConnectedAt: undefined,
    lastDisconnectedAt: undefined,
    reconnectAttempt: 0,
    loadShow: async () => {
      await refetchShow();
    },
    connect: async () => {
      if (connectPromise) return connectPromise;
      if (get().connectionStatus === "connected") return;

      set((state) => ({
        connectionStatus: state.connectionStatus === "idle" ? "connecting" : state.connectionStatus,
      }));

      connectPromise = getOrCreateSocketManager()
        .connect()
        .finally(() => {
          connectPromise = null;
        });

      return connectPromise;
    },
    disconnect: () => {
      socketManager?.disconnect();
      connectPromise = null;
      refetchPromise = null;
      queuedRefetchVersion = null;
      set({
        connectionStatus: "disconnected",
        canMutate: false,
        isResyncing: false,
        lastDisconnectedAt: Date.now(),
      });
    },
    reconnectNow: async () => {
      set({
        connectionStatus: "reconnecting",
        canMutate: false,
        isResyncing: true,
      });
      await getOrCreateSocketManager().reconnectNow();
    },
    optimizeCurrentShow: async () => {
      ensureMutableConnection(get().canMutate);
      const show = get().show;
      if (!show) return;
      const response = await apiClient.show.optimize.post({ showVersion: show.showVersion });
      if (response.error) throw new Error("Optimize failed");
      set({
        ...setShowState(response.data),
        canMutate: get().connectionStatus === "connected",
      });
    },
    clearCurrentShow: async () => {
      ensureMutableConnection(get().canMutate);
      const show = get().show;
      if (!show) return;
      const response = await apiClient.show.clear.post({ showVersion: show.showVersion });
      if (response.error) throw new Error("Clear failed");
      set({
        ...setShowState(response.data),
        canMutate: get().connectionStatus === "connected",
      });
    },
    importShowFile: async (file) => {
      ensureMutableConnection(get().canMutate);
      set({ loading: true, error: null });
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

        set({
          ...setShowState(response.data),
          canMutate: get().connectionStatus === "connected",
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Failed to import show file",
          loading: false,
        });
      }
    },
    exportCurrentShow: async () => {
      ensureMutableConnection(get().canMutate);
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
    },
    renameEvent: async (eventId, type, customName) => {
      ensureMutableConnection(get().canMutate);
      const show = get().show;
      if (!show) return;

      const normalizedCustomName = customName.trim();
      const response =
        type === "RES"
          ? await apiClient.show.events.resolve({ id: String(eventId) }).patch({
              showVersion: show.showVersion,
              ...(normalizedCustomName.length > 0 ? { customName: normalizedCustomName } : {}),
            })
          : await apiClient.show.events["non-resolve"]({ id: String(eventId) }).patch({
              showVersion: show.showVersion,
              ...(normalizedCustomName.length > 0 ? { customName: normalizedCustomName } : {}),
            });

      if (response.error) throw new Error("Rename failed");
      set({
        ...setShowState(response.data),
        canMutate: get().connectionStatus === "connected",
      });
    },
    applyWebSocketMessage: async (message) => {
      if (get().connectionStatus !== "connected") return;

      if (
        message.type === "show-refetch-required" ||
        message.type === "show-replaced" ||
        message.type === "live-mode-changed"
      ) {
        await queueRefetch(message.showVersion);
        return;
      }

      if (message.type === "playback-state-changed") {
        if (get().isResyncing) return;

        const show = get().show;
        if (!show) {
          await refetchShow();
          return;
        }

        if (message.showVersion <= show.showVersion) {
          return;
        }

        const nextShow = {
          ...show,
          showVersion: message.showVersion,
          playback: message.playback,
        };
        set({
          show: nextShow,
          rows: deriveRows(nextShow),
        });
      }
    },
    toggleLiveMode: async () => {
      ensureMutableConnection(get().canMutate);
      const show = get().show;
      if (!show) return;

      const isLive = show.mode === "live";
      const response = isLive
        ? await apiClient.show.live.delete()
        : await apiClient.show.live.post();
      if (response.error) throw new Error("Failed to set live mode");
      set({
        ...setShowState(response.data),
        canMutate: get().connectionStatus === "connected",
      });
    },
  };
});

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
