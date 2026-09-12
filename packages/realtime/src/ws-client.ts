import { create, fromBinary, toBinary } from "@bufbuild/protobuf";

import {
  ClockSyncRequestSchema,
  ClockSyncResponseSchema,
  EnvelopeSchema,
  type ClockSyncResponse as ProtoClockSyncResponse,
} from "./proto/gen/show/v1/show_pb.js";
import { ShowMessageType, type ShowWebSocketMessage } from "./types.js";

export { ClockSyncResponseSchema };
export type DecodedEnvelope = ReturnType<typeof decodeEnvelope>;

export function decodeEnvelope(
  data: ArrayBuffer,
): ReturnType<typeof fromBinary<typeof EnvelopeSchema>> {
  return fromBinary(EnvelopeSchema, new Uint8Array(data));
}

export function encodeClockSyncRequest(clientTimeUnixMs: number): Uint8Array<ArrayBuffer> {
  return toBinary(
    ClockSyncRequestSchema,
    create(ClockSyncRequestSchema, { clientTimeUnixMs: BigInt(clientTimeUnixMs) }),
  );
}

export function clockResponseToMessage(response: ProtoClockSyncResponse): {
  clientTimeUnixMs: number;
  serverReceivedAtUnixMs: number;
  serverTransmittedAtUnixMs: number;
} {
  return {
    clientTimeUnixMs: Number(response.clientTimeUnixMs),
    serverReceivedAtUnixMs: Number(response.receivedAtUnixMs),
    serverTransmittedAtUnixMs: Number(response.transmittedAtUnixMs),
  };
}

const wireToMessageType: Record<string, ShowMessageType> = {
  TimelineEventAdded: ShowMessageType.TimelineEventAdded,
  TimelineEventUpdated: ShowMessageType.TimelineEventUpdated,
  TimelineEventRemoved: ShowMessageType.TimelineEventRemoved,
  TimelineReordered: ShowMessageType.TimelineReordered,
  ShowReplaced: ShowMessageType.ShowReplaced,
  PlaybackStateChanged: ShowMessageType.PlaybackStateChanged,
  LiveModeChanged: ShowMessageType.LiveModeChanged,
};

export function envelopeToMessageType(type: string): ShowMessageType | undefined {
  return wireToMessageType[type];
}

export function envelopeToMessage(envelope: {
  type: string;
  showVersion: number;
}): Pick<ShowWebSocketMessage, "type" | "showVersion"> | undefined {
  const mapped = envelopeToMessageType(envelope.type);
  if (!mapped) return undefined;
  return { type: mapped, showVersion: envelope.showVersion } as Pick<
    ShowWebSocketMessage,
    "type" | "showVersion"
  >;
}

export const HUB_AUTH_CLOSE_CODE = 4401;

export function hubUrl(httpUrl: string, token?: string): string {
  const base = `${httpUrl.replace(/^http/, "ws")}/hubs/show`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export interface HubCallbacks {
  onEnvelope: (envelope: ReturnType<typeof decodeEnvelope>) => void;
  onOpen: () => void;
  onClose: (event: CloseEvent) => void;
  onError: () => void;
}

export function connectShowHub(url: string, callbacks: HubCallbacks, token?: string): WebSocket {
  const wsUrl = hubUrl(url, token);
  const loggedUrl = hubUrl(url);
  console.log(`[ws-client] Connecting to WebSocket: ${loggedUrl}`);
  const ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    console.log(`[ws-client] WebSocket connected to ${loggedUrl}`);
    callbacks.onOpen();
  };
  ws.onclose = (event) => {
    console.log(`[ws-client] WebSocket closed: code=${event.code}, reason="${event.reason}"`);
    callbacks.onClose(event);
  };
  ws.onerror = (event) => {
    console.error(`[ws-client] WebSocket error:`, event);
    callbacks.onError();
  };
  ws.onmessage = (event: MessageEvent) => {
    if (!(event.data instanceof ArrayBuffer)) return;
    try {
      callbacks.onEnvelope(decodeEnvelope(event.data));
    } catch {
      // Ignore undecodable frames; the next full snapshot resync converges state.
    }
  };
  return ws;
}
