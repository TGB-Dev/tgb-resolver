import { fromBinary } from "@bufbuild/protobuf";

import { AuthUpdateSchema } from "./proto/gen/auth/v1/auth_pb.js";

export { AuthUpdateSchema };

export type AuthUpdateKind = "sessions-changed" | "join-code-changed" | undefined;

export function decodeAuthUpdate(data: ArrayBuffer): AuthUpdateKind {
  const msg = fromBinary(AuthUpdateSchema, new Uint8Array(data));
  switch (msg.update.case) {
    case "sessionsChanged":
      return "sessions-changed";
    case "joinCodeChanged":
      return "join-code-changed";
    default:
      return undefined;
  }
}
