import type { TimelineEvent } from "@tgb-resolver/realtime";
import {
  deriveLeaderboard,
  PlaybackStatus,
  type ShowFile,
  ShowMode,
  ShowSource,
  TimelineEventType,
  TimelineMode,
} from "@tgb-resolver/realtime";
import { beforeEach, expect, test, vi } from "vitest";

import { leaderboardModel } from "./leaderboard-model";

vi.mock("@tgb-resolver/realtime", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tgb-resolver/realtime")>();
  return { ...mod, deriveLeaderboard: vi.fn(mod.deriveLeaderboard) };
});

const deriveMock = vi.mocked(deriveLeaderboard);

function makeShow(showVersion: number, events: TimelineEvent[]): ShowFile {
  return {
    schemaVersion: 1,
    showVersion,
    mode: ShowMode.EDITING,
    timelineMode: TimelineMode.RW,
    meta: { title: "t", source: ShowSource.MANUAL },
    contest: {
      durationSeconds: 0,
      freezeDurationSeconds: 0,
      problems: [],
      users: [],
      preFreezeSnapshot: [],
    },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: 3_000,
      fullAutoEnabled: false,
    },
    playback: { status: PlaybackStatus.IDLE, activeEventIds: [] },
    assets: { items: [] },
    timeline: events,
  };
}

function event(id: number): TimelineEvent {
  return {
    id,
    position: id,
    type: TimelineEventType.CUS,
    payload: { extId: `ext${id}`, extPayload: { key: "value" } },
  };
}

beforeEach(() => {
  deriveMock.mockClear();
});

test("sync skips derivation when called again with the same show and upToEventId", () => {
  const show = makeShow(1, [event(1), event(2)]);

  leaderboardModel.sync(show, 5);
  leaderboardModel.sync(show, 5);

  expect(deriveMock).toHaveBeenCalledTimes(1);
});

test("sync re-derives when upToEventId changes", () => {
  const show = makeShow(1, [event(1), event(2)]);

  leaderboardModel.sync(show, 5);
  leaderboardModel.sync(show, 6);

  expect(deriveMock).toHaveBeenCalledTimes(2);
});

test("sync re-derives when the show reference changes", () => {
  leaderboardModel.sync(makeShow(1, [event(1)]), 5);
  leaderboardModel.sync(makeShow(2, [event(1)]), 5);

  expect(deriveMock).toHaveBeenCalledTimes(2);
});
