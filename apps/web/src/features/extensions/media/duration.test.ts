import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { showModel } from "@/features/shared/show-model";

import {
  assetContentType,
  computeAssetDuration,
  computeMediaExtensionDuration,
  isPlayableAsset,
} from "./duration";

const { Input } = vi.hoisted(() => ({ Input: vi.fn() }));

vi.mock("mediabunny", () => ({ ALL_FORMATS: [], BufferSource: vi.fn(), Input }));
vi.mock("@/utils/preload-assets", () => ({ getPreloadedAsset: vi.fn(() => undefined) }));

function mockInput(config: {
  metadata: number | null;
  computed?: number;
  computedOnce?: number[];
}): void {
  const shape = {
    getDurationFromMetadata: vi.fn().mockResolvedValue(config.metadata),
    computeDuration: vi.fn().mockResolvedValue(config.computed ?? 12.345),
    dispose: vi.fn(),
  };
  for (const value of config.computedOnce ?? []) shape.computeDuration.mockResolvedValueOnce(value);
  // biome-ignore lint/complexity/useArrowFunction: mock must be a constructor for `new Input()`
  Input.mockImplementation(function () {
    return shape;
  });
}

function setAsset(contentType: string | undefined): void {
  showModel.showFile.value = { assets: { items: [{ id: "asset-1", contentType }] } } as never;
}

beforeEach(() => {
  Input.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  showModel.showFile.value = null;
  vi.restoreAllMocks();
});

describe("assetContentType / isPlayableAsset", () => {
  test("resolves content type from the show file", () => {
    setAsset("video/mp4");
    expect(assetContentType("asset-1")).toBe("video/mp4");
  });

  test("treats video and audio as playable, images as not", () => {
    setAsset("video/mp4");
    expect(isPlayableAsset("asset-1")).toBe(true);
    setAsset("audio/mpeg");
    expect(isPlayableAsset("asset-1")).toBe(true);
    setAsset("image/png");
    expect(isPlayableAsset("asset-1")).toBe(false);
  });

  test("unknown or empty asset is not playable", () => {
    expect(isPlayableAsset("")).toBe(false);
    expect(isPlayableAsset("missing")).toBe(false);
  });
});

describe("computeAssetDuration", () => {
  test("returns null when the asset is not playable and never fetches", async () => {
    setAsset("image/png");
    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockClear();
    await expect(computeAssetDuration("asset-1")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(Input).not.toHaveBeenCalled();
  });

  test("returns null for an empty asset id", async () => {
    await expect(computeAssetDuration("")).resolves.toBeNull();
  });

  test("uses metadata duration when present", async () => {
    setAsset("video/mp4");
    mockInput({ metadata: 9.5 });
    await expect(computeAssetDuration("asset-1")).resolves.toBe(9.5);
  });

  test("falls back to computeDuration and rounds to two decimals", async () => {
    setAsset("video/mp4");
    mockInput({ metadata: null, computed: 12.3456 });
    await expect(computeAssetDuration("asset-1")).resolves.toBe(12.35);
  });

  test("fetches the asset from the API when not preloaded", async () => {
    setAsset("audio/mpeg");
    mockInput({ metadata: 3 });
    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockClear();
    await computeAssetDuration("asset-1");
    expect(fetchSpy).toHaveBeenCalledWith("http://localhost:5001/assets/asset-1");
  });

  test("throws when the asset fetch fails", async () => {
    setAsset("audio/mpeg");
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({ ok: false, status: 404 } as never);
    await expect(computeAssetDuration("asset-1")).rejects.toThrow("Failed to fetch asset");
  });
});

describe("computeMediaExtensionDuration", () => {
  test("returns null when no playable asset is set", async () => {
    await expect(computeMediaExtensionDuration({})).resolves.toBeNull();
  });

  test("uses the video duration when only a video asset is set", async () => {
    setAsset("video/mp4");
    mockInput({ metadata: 5 });
    await expect(computeMediaExtensionDuration({ assetId: "asset-1" })).resolves.toBe(5);
  });

  test("uses the audio duration when only an audio asset is set", async () => {
    setAsset("audio/mpeg");
    mockInput({ metadata: 7 });
    await expect(computeMediaExtensionDuration({ audioAssetId: "asset-1" })).resolves.toBe(7);
  });

  test("returns the max when both visual and audio are playable", async () => {
    showModel.showFile.value = {
      assets: {
        items: [
          { id: "asset-1", contentType: "video/mp4" },
          { id: "asset-2", contentType: "audio/mpeg" },
        ],
      },
    } as never;
    mockInput({ metadata: null, computed: 5, computedOnce: [9] });
    await expect(
      computeMediaExtensionDuration({ assetId: "asset-1", audioAssetId: "asset-2" }),
    ).resolves.toBe(9);
  });
});
