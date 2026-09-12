import { describe, expect, it } from "vitest";

import { formatLastSeen } from "@/features/auth/last-seen";

const NOW = Date.parse("2026-09-12T07:00:10Z");

describe("formatLastSeen", () => {
  it("shows now for online sessions", () => {
    expect(formatLastSeen(true, "2026-09-12T06:00:00Z", NOW)).toBe("now");
  });

  it("shows now within the offline grace window", () => {
    expect(formatLastSeen(false, "2026-09-12T07:00:05Z", NOW)).toBe("now");
  });

  it("shows the timestamp after the grace window", () => {
    expect(formatLastSeen(false, "2026-09-12T06:00:00Z", NOW)).toBe(
      new Date("2026-09-12T06:00:00Z").toLocaleString(),
    );
  });
});
