import { create, toBinary } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { decodeAuthUpdate } from "./auth-presence";
import {
  AuthUpdateSchema,
  JoinCodeChangedSchema,
  SessionsChangedSchema,
} from "./proto/gen/auth/v1/auth_pb.js";

function encode(update: Parameters<typeof create<typeof AuthUpdateSchema>>[1]): ArrayBuffer {
  const raw = toBinary(AuthUpdateSchema, create(AuthUpdateSchema, update));
  return raw.buffer as ArrayBuffer;
}

describe("decodeAuthUpdate", () => {
  it("maps join-code-changed frames", () => {
    const frame = encode({
      update: { case: "joinCodeChanged", value: create(JoinCodeChangedSchema, {}) },
    });
    expect(decodeAuthUpdate(frame)).toBe("join-code-changed");
  });

  it("maps sessions-changed frames", () => {
    const frame = encode({
      update: { case: "sessionsChanged", value: create(SessionsChangedSchema, {}) },
    });
    expect(decodeAuthUpdate(frame)).toBe("sessions-changed");
  });

  it("returns undefined for empty updates", () => {
    const frame = encode({});
    expect(decodeAuthUpdate(frame)).toBeUndefined();
  });
});
