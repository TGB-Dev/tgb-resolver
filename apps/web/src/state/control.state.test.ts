import type { ShowFile } from "@tgb-resolver/contracts";
import { createEmptyShow } from "@tgb-resolver/contracts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  applyWebSocketMessageAtom,
  appStore,
  connectControlAtom,
  controlCanMutateAtom,
  controlConnectionStatusAtom,
  controlRowsAtom,
  controlShowAtom,
  loadControlShowAtom,
  optimizeCurrentShowAtom,
  renameControlEventAtom,
  resetControlStateForTests,
} from "./control";

const websocketManagerMock = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  reconnectNow: vi.fn(),
}));

const websocketCallbacksRef = vi.hoisted(() => ({
  current: null as null | Parameters<typeof import("@/lib/api").createShowWebSocketManager>[0],
}));

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
  createShowWebSocketManager: vi.fn((callbacks) => {
    websocketCallbacksRef.current = callbacks;
    return websocketManagerMock;
  }),
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

describe("control atoms", () => {
  beforeEach(() => {
    resetControlStateForTests();

    websocketManagerMock.connect.mockResolvedValue(undefined);
    websocketManagerMock.disconnect.mockImplementation(() => undefined);
    websocketManagerMock.reconnectNow.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("hydrates timeline rows from the canonical show", async () => {
    apiClientMock.show.get.mockResolvedValue({
      data: createShow(),
      error: null,
      status: 200,
      headers: {},
      response: new Response(),
    });

    await appStore.set(loadControlShowAtom);

    const rows = appStore.get(controlRowsAtom);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({
      id: 2,
      assetId: "stinger",
      durationSeconds: 2,
      isCurrentInlineEvent: true,
    });
  });

  test("connect is idempotent and only connects one websocket manager", async () => {
    await Promise.all([
      appStore.set(connectControlAtom),
      appStore.set(connectControlAtom),
      appStore.set(connectControlAtom),
    ]);

    expect(websocketManagerMock.connect).toHaveBeenCalledTimes(1);
  });

  test("socket open refetches once and re-enables mutations", async () => {
    apiClientMock.show.get.mockResolvedValue({
      data: createShow(),
      error: null,
      status: 200,
      headers: {},
      response: new Response(),
    });

    await appStore.set(connectControlAtom);
    await websocketCallbacksRef.current?.onOpen(2);

    expect(apiClientMock.show.get).toHaveBeenCalledTimes(1);
    expect(appStore.get(controlConnectionStatusAtom)).toBe("connected");
    expect(appStore.get(controlCanMutateAtom)).toBe(true);
  });

  test("blocks mutations while reconnecting", async () => {
    appStore.set(controlConnectionStatusAtom, "reconnecting");
    appStore.set(controlCanMutateAtom, false);
    appStore.set(controlShowAtom, createShow());

    await expect(appStore.set(optimizeCurrentShowAtom)).rejects.toThrow(
      "Control connection is offline",
    );
    expect(apiClientMock.show.optimize.post).not.toHaveBeenCalled();
  });

  test("ignores stale websocket playback updates", async () => {
    const show = createShow();
    appStore.set(controlShowAtom, {
      ...show,
      showVersion: 50,
    });
    appStore.set(controlConnectionStatusAtom, "connected");

    await appStore.set(applyWebSocketMessageAtom, {
      type: "playback-state-changed",
      showVersion: 49,
      playback: {
        status: "paused",
      },
    });

    expect(appStore.get(controlShowAtom)?.playback.status).toBe("running");
  });

  test("coalesces refetch-triggering websocket messages while a refetch is in flight", async () => {
    let hasFetchResolver = false;
    let resolveFetch = (_value: {
      data: ShowFile;
      error: null;
      status: number;
      headers: Record<string, string>;
      response: Response;
    }): void => {};

    apiClientMock.show.get.mockReturnValue(
      new Promise((resolve) => {
        hasFetchResolver = true;
        resolveFetch = resolve;
      }),
    );

    appStore.set(controlShowAtom, {
      ...createShow(),
      showVersion: 10,
    });
    appStore.set(controlConnectionStatusAtom, "connected");

    const firstRefetch = appStore.set(applyWebSocketMessageAtom, {
      type: "show-refetch-required",
      showVersion: 12,
      reason: "optimized",
    });
    const secondRefetch = appStore.set(applyWebSocketMessageAtom, {
      type: "show-replaced",
      showVersion: 13,
      source: "manual",
    });

    expect(apiClientMock.show.get).toHaveBeenCalledTimes(1);
    expect(hasFetchResolver).toBe(true);

    resolveFetch({
      data: {
        ...createShow(),
        showVersion: 13,
      },
      error: null,
      status: 200,
      headers: {},
      response: new Response(),
    });

    await firstRefetch;
    await secondRefetch;

    expect(apiClientMock.show.get).toHaveBeenCalledTimes(1);
    expect(appStore.get(controlShowAtom)?.showVersion).toBe(13);
  });

  test("sends an empty customName to reset an event label back to its placeholder", async () => {
    const resolvePatch = vi.fn().mockResolvedValue({
      data: createShow(),
      error: null,
      status: 200,
      headers: {},
      response: new Response(),
    });
    apiClientMock.show.events.resolve.mockReturnValue({ patch: resolvePatch });

    appStore.set(controlShowAtom, createShow());
    appStore.set(controlConnectionStatusAtom, "connected");
    appStore.set(controlCanMutateAtom, true);

    await appStore.set(renameControlEventAtom, {
      eventId: 3,
      type: "RES",
      customName: "",
    });

    expect(resolvePatch).toHaveBeenCalledWith({
      showVersion: createShow().showVersion,
      customName: "",
    });
  });
});
