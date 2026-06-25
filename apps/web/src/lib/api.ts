import { treaty } from "@elysia/eden";
import { FILE_EXTENSION, type ShowWebSocketMessage } from "@tgb-resolver/contracts";
import type { App } from "@tgb-resolver/server";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const apiClient = treaty<App>(API_BASE_URL);

export async function connectShowWebSocket(
  onMessage: (message: ShowWebSocketMessage) => void,
): Promise<WebSocket> {
  const wsUrl = API_BASE_URL.replace(/^http/, "ws");
  const socket = new WebSocket(`${wsUrl}/ws`);
  socket.addEventListener("message", (event) => {
    onMessage(JSON.parse(event.data) as ShowWebSocketMessage);
  });
  return socket;
}

export { FILE_EXTENSION };
