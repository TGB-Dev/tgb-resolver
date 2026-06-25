import type { ShowFile } from "@tgb-resolver/contracts";
import { createEmptyShow } from "@tgb-resolver/contracts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useControlStore } from "./control.store";

const apiClientMock = vi.hoisted(() => ({
  show: {
    get: vi.fn(),
    optimize: { post: vi.fn() },
    clear: { post: vi.fn() },
    import: {
      xml: { post: vi.fn() },
      bundle: { post: vi.fn() },
    },
    export: { bundle: { get: vi.fn() } },
    live: { post: vi.fn(), delete: vi.fn() },
    events: {
      resolve: vi.fn(() => ({ patch: vi.fn() })),
      "non-resolve": vi.fn(() => ({ patch: vi.fn() })),
    },
  },
  playback: {
    start: { post: vi.fn() },
    reset: { post: vi.fn() },
  },
}));

vi.mock("@/lib/api", () => ({
  apiClient: apiClientMock,
  connectShowWebSocket: vi.fn(async () => new WebSocket("ws://localhost")),
  FILE_EXTENSION: ".tgbresolver",
}));

function createShow(): ShowFile {
  return createEmptyShow({
    meta: {
      title: "Control",
      source: "manual",
    },
    playback: {
      status: "running",
      currentResolveEventId: 1,
      currentEventId: 2,
      activeSegment: {
        resolveEventId: 1,
        nextResolveEventId: 3,
        inlineEventIds: [2],
        currentInlineIndex: 0,
      },
    },
    timeline: [
      {
        id: 1,
        type: "RES",
        payload: {
          realName: "Alice Team",
          username: "alice",
          problem: "A",
          newScore: 100,
          newRank: 2,
        },
      },
      {
        id: 2,
        type: "SFX",
        payload: {
          sfxId: "stinger",
          durationSeconds: 2,
        },
      },
      {
        id: 3,
        type: "RES",
        customName: "B. Bob",
        payload: {
          realName: "Bob Team",
          username: "bob",
          problem: "B",
          newScore: 200,
          newRank: 1,
        },
      },
    ],
  });
}

describe("useControlStore", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "WebSocket",
      class {
        addEventListener() {}
      },
    );
    useControlStore.setState({
      show: null,
      loading: false,
      error: null,
      rows: [],
      ws: null,
      loadShow: useControlStore.getState().loadShow,
      connect: useControlStore.getState().connect,
      optimizeCurrentShow: useControlStore.getState().optimizeCurrentShow,
      clearCurrentShow: useControlStore.getState().clearCurrentShow,
      renameEvent: useControlStore.getState().renameEvent,
      applyWebSocketMessage: useControlStore.getState().applyWebSocketMessage,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test("hydrates timeline rows from the canonical show", async () => {
    apiClientMock.show.get.mockResolvedValue({
      data: createShow(),
      error: null,
      status: 200,
      headers: {},
      response: new Response(),
    });

    await useControlStore.getState().loadShow();

    const state = useControlStore.getState();
    expect(state.rows).toHaveLength(3);
    expect(state.rows[1]).toMatchObject({
      id: 2,
      assetId: "stinger",
      durationSeconds: 2,
      isCurrentInlineEvent: true,
    });
  });
});
