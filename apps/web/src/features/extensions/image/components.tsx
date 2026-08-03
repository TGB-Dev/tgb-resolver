import { Box, Text } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { motion } from "motion/react";
import { useEffect } from "react";

import { TgbResolverEasings } from "@/features/shared/anim/easings";
import { getPreloadedAsset } from "@/utils/preload-assets";

import type { ImageExtensionPayload } from "./index";

const MotionBox = motion.create(Box);

interface ImageExtensionComponentProps {
  payload: ImageExtensionPayload;
}

export function ImageExtensionComponent({ payload }: ImageExtensionComponentProps) {
  const assetId = payload?.assetId ?? "";
  const fit = payload?.fit ?? "cover";
  const objectUrl = useSignal<string | null>(null);
  const hasError = useSignal(false);

  useEffect(() => {
    hasError.value = false;
    objectUrl.value = null;
    if (!assetId) return undefined;

    const buffer = getPreloadedAsset(assetId);
    if (buffer) {
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      objectUrl.value = url;
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    objectUrl.value = `${baseUrl}/assets/${assetId}`;
    return undefined;
  }, [assetId, hasError, objectUrl]);

  if (!assetId || hasError.value) {
    return (
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: TgbResolverEasings.swiftOut }}
        position="absolute"
        top={0}
        left={0}
        w="full"
        h="full"
        bg="bg"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={1000}
      >
        <Text fontSize="lg" fontFamily="mono">
          Asset not found: {assetId || "none"}
        </Text>
      </MotionBox>
    );
  }

  if (!objectUrl.value) return null;

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: TgbResolverEasings.swiftOut }}
      position="absolute"
      top={0}
      left={0}
      w="full"
      h="full"
      bg="bg"
      zIndex={1000}
    >
      <img
        src={objectUrl.value}
        alt={`asset ${assetId}`}
        onError={() => (hasError.value = true)}
        style={{ width: "100%", height: "100%", objectFit: fit }}
      />
    </MotionBox>
  );
}
