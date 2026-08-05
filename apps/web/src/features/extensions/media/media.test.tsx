import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ShowFile } from "@tgb-resolver/realtime";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ExtensionType, extensionRegistry } from "@/features/extensions";
import { showModel } from "@/features/shared/show-model";
import { soundEngine } from "@/lib/sound-engine";

import { MediaExtensionComponent } from "./components";

vi.mock("@/lib/sound-engine", () => ({
  soundEngine: { playAssetAudio: vi.fn() },
}));

const playAssetAudio = vi.mocked(soundEngine.playAssetAudio);

function setShowFileAsset(assetId: string, contentType: string): void {
  showModel.showFile.value = {
    assets: { items: [{ id: assetId, contentType }] },
  } as unknown as ShowFile;
}

beforeEach(() => {
  playAssetAudio.mockReset();
  playAssetAudio.mockResolvedValue(() => undefined);
});

afterEach(() => {
  cleanup();
  showModel.showFile.value = null;
});

describe("MediaExtension", () => {
  test("is registered as a WithReactComponent extension with a config form", () => {
    const ext = extensionRegistry.extensionWithExtId("media");
    expect(ext).toBeDefined();
    expect(ext?.type).toBe(ExtensionType.WithReactComponent);
    expect(ext?.configForm).toBeDefined();
  });

  test("renders nothing when no asset is entered", () => {
    const view = render(<MediaExtensionComponent payload={{ assetId: "" }} />);
    expect(view.container).toBeEmptyDOMElement();
  });

  test("renders an image when the asset content type is an image", async () => {
    setShowFileAsset("asset-1", "image/png");
    render(<MediaExtensionComponent payload={{ assetId: "asset-1", fit: "contain" }} />);

    const img = await screen.findByRole("img");
    expect(img).toHaveAttribute("src", "http://localhost:5001/assets/asset-1");
  });

  test("renders a video element (not muted) when the asset content type is a video", async () => {
    setShowFileAsset("asset-1", "video/mp4");
    const view = render(<MediaExtensionComponent payload={{ assetId: "asset-1", loop: false }} />);

    await waitFor(() => {
      const video = view.container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video?.hasAttribute("muted")).toBe(false);
    });
  });

  test("plays audio-only through the sound engine when only an audio asset is set", async () => {
    const view = render(
      <MediaExtensionComponent payload={{ audioAssetId: "audio-1", loop: true, volume: 0.3 }} />,
    );

    await waitFor(() =>
      expect(playAssetAudio).toHaveBeenCalledWith("http://localhost:5001/assets/audio-1", {
        loop: true,
        volume: 0.3,
      }),
    );
    expect(view.container).toBeEmptyDOMElement();
  });

  test("renders an image and layers the audio track when image + audio are set", async () => {
    setShowFileAsset("visual-1", "image/png");
    const view = render(
      <MediaExtensionComponent
        payload={{ assetId: "visual-1", audioAssetId: "audio-1", loop: true, volume: 0.5 }}
      />,
    );

    const img = await screen.findByRole("img");
    expect(img).toHaveAttribute("src", "http://localhost:5001/assets/visual-1");
    await waitFor(() =>
      expect(playAssetAudio).toHaveBeenCalledWith("http://localhost:5001/assets/audio-1", {
        loop: true,
        volume: 0.5,
      }),
    );
    expect(view.container.querySelector("video")).toBeNull();
  });

  test("renders a video and layers the audio track when both are set", async () => {
    setShowFileAsset("visual-1", "video/mp4");
    const view = render(
      <MediaExtensionComponent payload={{ assetId: "visual-1", audioAssetId: "audio-1" }} />,
    );

    await waitFor(() => expect(view.container.querySelector("video")).not.toBeNull());
    await waitFor(() =>
      expect(playAssetAudio).toHaveBeenCalledWith("http://localhost:5001/assets/audio-1", {
        loop: true,
        volume: 0.5,
      }),
    );
  });

  test("honours loop: false for audio and does not loop the video", async () => {
    setShowFileAsset("visual-1", "video/mp4");
    const view = render(
      <MediaExtensionComponent
        payload={{ assetId: "visual-1", audioAssetId: "audio-1", loop: false, volume: 0.8 }}
      />,
    );

    await waitFor(() => {
      const video = view.container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video?.hasAttribute("loop")).toBe(false);
    });
    await waitFor(() =>
      expect(playAssetAudio).toHaveBeenCalledWith("http://localhost:5001/assets/audio-1", {
        loop: false,
        volume: 0.8,
      }),
    );
  });
});
