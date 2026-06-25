import {
  FILE_EXTENSION,
  type ShowFile,
  type ShowWebSocketMessage,
  type TimelineTableItem,
  toTimelineTableItems,
} from "@tgb-resolver/contracts";
import { create } from "zustand";
import { apiClient, connectShowWebSocket } from "@/lib/api";

interface ControlStore {
  show: ShowFile | null;
  loading: boolean;
  error: string | null;
  rows: TimelineTableItem[];
  ws: WebSocket | null;
  loadShow: () => Promise<void>;
  connect: () => Promise<void>;
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
  setLiveMode: (isLive: boolean) => Promise<void>;
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

export const useControlStore = create<ControlStore>((set, get) => ({
  show: null,
  loading: false,
  error: null,
  rows: [],
  ws: null,
  loadShow: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.show.get();
      if (response.error) throw new Error("Failed to load show");
      set(setShowState(response.data));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load show",
        loading: false,
      });
    }
  },
  connect: async () => {
    if (get().ws) return;
    const socket = await connectShowWebSocket(async (message) => {
      await get().applyWebSocketMessage(message);
    });
    set({ ws: socket });
  },
  optimizeCurrentShow: async () => {
    const show = get().show;
    if (!show) return;
    const response = await apiClient.show.optimize.post({ showVersion: show.showVersion });
    if (response.error) throw new Error("Optimize failed");
    set(setShowState(response.data));
  },
  clearCurrentShow: async () => {
    const show = get().show;
    if (!show) return;
    const response = await apiClient.show.clear.post({ showVersion: show.showVersion });
    if (response.error) throw new Error("Clear failed");
    set(setShowState(response.data));
  },
  importShowFile: async (file) => {
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

      set(setShowState(response.data));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to import show file",
        loading: false,
      });
    }
  },
  exportCurrentShow: async () => {
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
    set(setShowState(response.data));
  },
  applyWebSocketMessage: async (message) => {
    if (
      message.type === "show-refetch-required" ||
      message.type === "show-replaced" ||
      message.type === "live-mode-changed"
    ) {
      await get().loadShow();
      return;
    }

    if (message.type === "playback-state-changed") {
      const show = get().show;
      if (!show) {
        await get().loadShow();
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
  setLiveMode: async (isLive) => {
    const show = get().show;
    if (!show) return;

    const response = isLive ? await apiClient.show.live.post() : await apiClient.show.live.delete();
    if (response.error) throw new Error("Failed to set live mode");
    set(setShowState(response.data));
  },
}));

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
