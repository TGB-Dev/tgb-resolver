import { useSignal } from "@preact/signals-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";
import { TgbResolverEasings } from "@/features/shared/anim/easings";
import { showModel } from "@/features/shared/show-model";
import { soundEngine } from "@/lib/sound-engine";
import { getPreloadedAsset } from "@/utils/preload-assets";

import type { MediaExtensionPayload } from "./index";

const MotionBox = motion.div;

function assetContentType(assetId: string): string | undefined {
  const showFile = showModel.showFile.value;
  if (showFile) {
    const asset = showFile.assets?.items?.find((item) => item.id === assetId);
    if (asset?.contentType) return asset.contentType;
  }
  const entry = assetsManagerModel.findEntry(assetId);
  if (entry && !entry.isDirectory && entry.contentType) return entry.contentType;
  return undefined;
}

function useAssetUrl(assetId: string): string | null {
  const url = useSignal<string | null>(null);

  useEffect(() => {
    url.value = null;
    if (!assetId) return undefined;

    const buffer = getPreloadedAsset(assetId);
    if (buffer) {
      const blob = new Blob([buffer]);
      const objectUrl = URL.createObjectURL(blob);
      url.value = objectUrl;
      return () => void URL.revokeObjectURL(objectUrl);
    }

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    url.value = `${baseUrl}/assets/${assetId}`;
    return undefined;
  }, [assetId, url]);

  return url.value;
}

interface MediaExtensionComponentProps {
  payload: MediaExtensionPayload;
}

export function MediaExtensionComponent({ payload }: MediaExtensionComponentProps) {
  const visualAssetId = payload?.assetId ?? "";
  const audioAssetId = payload?.audioAssetId ?? "";
  const visualUrl = useAssetUrl(visualAssetId);
  const audioUrl = useAssetUrl(audioAssetId);
  const hasError = useSignal(false);

  if (!visualAssetId && !audioAssetId) return null;

  const fit = payload?.fit ?? "cover";
  const loop = payload?.loop ?? true;
  const volume = payload?.volume ?? 0.5;

  const contentType = visualAssetId ? assetContentType(visualAssetId) : undefined;
  const isVideo = contentType?.startsWith("video/") ?? false;

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1000,
  };

  return (
    <>
      {audioAssetId && audioUrl && <AssetAudioPlayer url={audioUrl} loop={loop} volume={volume} />}
      {visualAssetId && visualUrl && !hasError.value ? (
        isVideo ? (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: TgbResolverEasings.swiftOut }}
            style={overlayStyle}
          >
            {/* biome-ignore lint/a11y/useMediaCaption: asset videos carry their own audio track; no caption file exists */}
            <video
              src={visualUrl}
              autoPlay
              loop={loop}
              playsInline
              ref={(element) => {
                if (element) element.volume = volume;
              }}
              onError={() => (hasError.value = true)}
              style={{ width: "100%", height: "100%", objectFit: fit }}
            />
          </MotionBox>
        ) : (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: TgbResolverEasings.swiftOut }}
            style={overlayStyle}
          >
            <img
              src={visualUrl}
              alt={`asset ${visualAssetId}`}
              onError={() => (hasError.value = true)}
              style={{ width: "100%", height: "100%", objectFit: fit }}
            />
          </MotionBox>
        )
      ) : null}
    </>
  );
}

function AssetAudioPlayer({ url, loop, volume }: { url: string; loop: boolean; volume: number }) {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;

    void soundEngine.playAssetAudio(url, { loop, volume }).then((stopper) => {
      if (!active) {
        stopper();
        return;
      }
      stop = stopper;
      stopRef.current = stopper;
    });

    return () => {
      active = false;
      if (stop) stop();
    };
  }, [url, loop, volume]);

  return null;
}
