import { describe, expect, it } from "vitest";

import { MIN_STAGE_SHARE, stageMinimumWidth } from "./control-workspace-types";

describe("stageMinimumWidth", () => {
  it("reserves the configured share of the workspace for the timeline", () => {
    expect(stageMinimumWidth(1000)).toBe(1000 * MIN_STAGE_SHARE);
    expect(stageMinimumWidth(1234)).toBe(Math.round(1234 * MIN_STAGE_SHARE));
  });

  it("rounds to whole pixels", () => {
    expect(stageMinimumWidth(1001.6)).toBe(Math.round(1001.6 * MIN_STAGE_SHARE));
  });
});
