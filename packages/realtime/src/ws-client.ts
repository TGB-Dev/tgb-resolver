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

export function hubUrl(httpUrl: string): string {
  return `${httpUrl.replace(/^http/, "ws")}/hubs/show`;
}

export interface HubCallbacks {
  onEnvelope: (envelope: ReturnType<typeof decodeEnvelope>) => void;
  onOpen: () => void;
  onClose: (event: CloseEvent) => void;
  onError: () => void;
}

export function connectShowHub(url: string, callbacks: HubCallbacks): WebSocket {
  const ws = new WebSocket(hubUrl(url));
  ws.binaryType = "arraybuffer";
  ws.onopen = () => callbacks.onOpen();
  ws.onclose = (event) => callbacks.onClose(event);
  ws.onerror = () => callbacks.onError();
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
