import { fromBinary } from "@bufbuild/protobuf";

import { AuthUpdateSchema } from "./proto/gen/auth/v1/auth_pb.js";

export { AuthUpdateSchema };

export enum AuthUpdateKind {
  SessionsChanged = "sessions-changed",
  JoinCodeChanged = "join-code-changed",
}

export function decodeAuthUpdate(data: ArrayBuffer): AuthUpdateKind | undefined {
  const msg = fromBinary(AuthUpdateSchema, new Uint8Array(data));
  switch (msg.update.case) {
    case "sessionsChanged":
      return AuthUpdateKind.SessionsChanged;
    case "joinCodeChanged":
      return AuthUpdateKind.JoinCodeChanged;
    default:
      return undefined;
  }
}
