import { ALL_FORMATS, BufferSource, Input } from "mediabunny";

import { useAssetsManagerStore } from "@/features/assets-manager/assets-manager-store";
import { assetUrl } from "@/lib/asset-url";
import { useShowStore } from "@/stores/show-store";
import { getPreloadedAsset } from "@/utils/preload-assets";

import type { MediaExtensionPayload } from "./index";

export function assetContentType(assetId: string): string | undefined {
  const showFile = useShowStore().showFile;
  if (showFile) {
    const asset = showFile.assets?.items?.find((item) => item.id === assetId);
    if (asset?.contentType) return asset.contentType;
  }
  const entry = useAssetsManagerStore().findEntry(assetId);
  return entry && !entry.isDirectory ? entry.contentType : undefined;
}

function isPlayableAsset(assetId: string): boolean {
  const contentType = assetContentType(assetId);
  if (!contentType) return false;
  return contentType.startsWith("video/") || contentType.startsWith("audio/");
}

async function computeAssetDuration(assetId: string): Promise<number | null> {
  if (!assetId || !isPlayableAsset(assetId)) return null;

  let buffer = getPreloadedAsset(assetId);
  if (!buffer) {
    const response = await fetch(assetUrl(assetId));
    if (!response.ok) throw new Error(`Failed to fetch asset ${assetId}: ${response.status}`);
    buffer = await response.arrayBuffer();
  }

  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(buffer) });
  try {
    const duration = (await input.getDurationFromMetadata()) ?? (await input.computeDuration());
    return Number.isFinite(duration) ? Math.round(duration * 100) / 100 : null;
  } finally {
    input.dispose();
  }
}

export async function computeMediaExtensionDuration(
  payload: MediaExtensionPayload,
): Promise<number | null> {
  const assetId = payload.assetId ?? "";
  const audioAssetId = payload.audioAssetId ?? "";

  const [visual, audio] = await Promise.all([
    computeAssetDuration(assetId),
    audioAssetId && audioAssetId !== assetId ? computeAssetDuration(audioAssetId) : null,
  ]);

  const durations = [visual, audio].filter((d): d is number => d !== null && d !== undefined);
  if (durations.length === 0) return null;
  return Math.max(...durations);
}
