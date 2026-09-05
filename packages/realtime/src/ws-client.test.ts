import { describe, expect, it } from "vitest";

import { ShowMessageType } from "./types";
import { envelopeToMessage, envelopeToMessageType, hubUrl } from "./ws-client";

describe("envelopeToMessage", () => {
  it("maps PlaybackStateChanged", () => {
    expect(envelopeToMessage({ type: "PlaybackStateChanged", showVersion: 3 })).toEqual({
      type: "playback-state-changed",
      showVersion: 3,
    });
  });

  it("returns undefined for unknown wire types", () => {
    expect(envelopeToMessage({ type: "Nope", showVersion: 1 })).toBeUndefined();
  });

  it("maps every hub wire type", () => {
    const cases: Array<[string, ShowMessageType]> = [
      ["TimelineEventAdded", ShowMessageType.TimelineEventAdded],
      ["TimelineEventUpdated", ShowMessageType.TimelineEventUpdated],
      ["TimelineEventRemoved", ShowMessageType.TimelineEventRemoved],
      ["TimelineReordered", ShowMessageType.TimelineReordered],
      ["ShowReplaced", ShowMessageType.ShowReplaced],
      ["PlaybackStateChanged", ShowMessageType.PlaybackStateChanged],
      ["LiveModeChanged", ShowMessageType.LiveModeChanged],
    ];
    for (const [wire, expected] of cases) {
      expect(envelopeToMessageType(wire)).toBe(expected);
    }
  });

  it("builds ws hub url", () => {
    expect(hubUrl("http://localhost:5001")).toBe("ws://localhost:5001/hubs/show");
    expect(hubUrl("https://example.com")).toBe("wss://example.com/hubs/show");
  });
});
