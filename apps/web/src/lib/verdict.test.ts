import { VerdictRunResult } from "@tgb-resolver/contracts";
import { describe, expect, it } from "vitest";

import { verdictShortCode } from "./verdict";

describe("verdictShortCode", () => {
  it("returns space for UNKNOWN", () => {
    expect(verdictShortCode(VerdictRunResult.UNKNOWN)).toBe(" ");
  });

  it('returns "?" for UNRESOLVED', () => {
    expect(verdictShortCode(VerdictRunResult.UNRESOLVED)).toBe("?");
  });

  it('returns "?" for undefined', () => {
    expect(verdictShortCode()).toBe("?");
  });
});
