import type { ShowFile } from "@tgb-resolver/contracts";
import { createEmptyShow } from "@tgb-resolver/contracts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useControlStore } from "./control.store";

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

describe("useControlStore", () => {
  beforeEach(() => {
    useControlStore.setState({
      show: null,
      loading: false,
      error: null,
      rows: [],
      connectionStatus: "idle",
      canMutate: false,
      isResyncing: false,
      lastConnectedAt: undefined,
      lastDisconnectedAt: undefined,
      reconnectAttempt: 0,
      loadShow: useControlStore.getState().loadShow,
      connect: useControlStore.getState().connect,
      disconnect: useControlStore.getState().disconnect,
      reconnectNow: useControlStore.getState().reconnectNow,
      optimizeCurrentShow: useControlStore.getState().optimizeCurrentShow,
      clearCurrentShow: useControlStore.getState().clearCurrentShow,
      renameEvent: useControlStore.getState().renameEvent,
      applyWebSocketMessage: useControlStore.getState().applyWebSocketMessage,
      toggleLiveMode: useControlStore.getState().toggleLiveMode,
    });

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

  test("connect is idempotent and only connects one websocket manager", async () => {
    await Promise.all([
      useControlStore.getState().connect(),
      useControlStore.getState().connect(),
      useControlStore.getState().connect(),
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

    await useControlStore.getState().connect();
    await websocketCallbacksRef.current?.onOpen(2);

    const state = useControlStore.getState();
    expect(apiClientMock.show.get).toHaveBeenCalledTimes(1);
    expect(state.connectionStatus).toBe("connected");
    expect(state.canMutate).toBe(true);
    expect(state.reconnectAttempt).toBe(0);
  });

  test("blocks mutations while reconnecting", async () => {
    useControlStore.setState({
      connectionStatus: "reconnecting",
      canMutate: false,
      show: createShow(),
    });

    await expect(useControlStore.getState().optimizeCurrentShow()).rejects.toThrow(
      "Control connection is offline",
    );
    expect(apiClientMock.show.optimize.post).not.toHaveBeenCalled();
  });

  test("ignores stale websocket playback updates", async () => {
    const show = createShow();
    useControlStore.setState({
      show: {
        ...show,
        showVersion: 50,
      },
      rows: [],
      connectionStatus: "connected",
    });

    await useControlStore.getState().applyWebSocketMessage({
      type: "playback-state-changed",
      showVersion: 49,
      playback: {
        status: "paused",
      },
    });

    expect(useControlStore.getState().show?.playback.status).toBe("running");
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

    useControlStore.setState({
      show: {
        ...createShow(),
        showVersion: 10,
      },
      connectionStatus: "connected",
    });

    const firstRefetch = useControlStore.getState().applyWebSocketMessage({
      type: "show-refetch-required",
      showVersion: 12,
      reason: "optimized",
    });
    const secondRefetch = useControlStore.getState().applyWebSocketMessage({
      type: "show-replaced",
      showVersion: 13,
      source: "manual",
    });

    expect(apiClientMock.show.get).toHaveBeenCalledTimes(1);

    if (!hasFetchResolver) {
      throw new Error("Expected pending fetch resolver");
    }
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
    expect(useControlStore.getState().show?.showVersion).toBe(13);
  });
});
