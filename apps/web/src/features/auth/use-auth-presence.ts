import { useQueryClient } from "@tanstack/vue-query";
import { type AuthUpdateKind, decodeAuthUpdate } from "@tgb-resolver/realtime";
import { onUnmounted } from "vue";

import { parseErrorMessage } from "@/features/shared/ui/error-message";
import { toaster } from "@/features/shared/ui/toaster";
import { API_BASE_URL } from "@/lib/runtime-config";
import { readStoredToken, useAuthStore } from "@/stores/auth-store";

const RECONNECT_DELAYS = [500, 1_000, 2_000, 4_000, 8_000];
const AUTH_CLOSE_CODE = 4401;

export function useAuthPresence() {
  const queryClient = useQueryClient();
  const authStore = useAuthStore();
  let socket: WebSocket | null = null;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  function url() {
    const token = readStoredToken();
    const base = `${API_BASE_URL.replace(/^http/, "ws")}/hubs/auth`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  function connect() {
    if (stopped) return;
    const ws = new WebSocket(url());
    ws.binaryType = "arraybuffer";
    socket = ws;
    ws.onmessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      let kind: AuthUpdateKind;
      try {
        kind = decodeAuthUpdate(event.data);
      } catch (e) {
        toaster.create({
          title: "Auth update unreadable",
          description: parseErrorMessage(e),
          type: "error",
        });
        return;
      }
      if (kind === "sessions-changed") {
        void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
      } else if (kind === "join-code-changed") {
        void queryClient.invalidateQueries({ queryKey: ["auth", "join-code"] });
        void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
      }
    };
    ws.onclose = (event: CloseEvent) => {
      if (socket === ws) socket = null;
      if (stopped) return;
      if (event.code === AUTH_CLOSE_CODE) {
        authStore.markExpired();
        return;
      }
      const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
      attempt += 1;
      timer = setTimeout(connect, delay);
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  function disconnect() {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    socket?.close();
    socket = null;
  }

  onUnmounted(disconnect);
  connect();

  return { disconnect };
}
