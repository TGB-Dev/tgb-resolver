import { Box, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { getPreloadedAsset } from "@/utils/preload-assets";

import type { ImageExtensionPayload } from "./index";

interface ImageExtensionComponentProps {
  payload: ImageExtensionPayload;
}

export function ImageExtensionComponent({ payload }: ImageExtensionComponentProps) {
  const assetId = payload?.assetId ?? "";
  const fit = payload?.fit ?? "cover";
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (!assetId) return undefined;

    const buffer = getPreloadedAsset(assetId);
    if (buffer) {
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    setObjectUrl(`${baseUrl}/assets/${assetId}`);
    return undefined;
  }, [assetId]);

  if (!assetId || hasError) {
    return (
      <Box
        position="absolute"
        top="0"
        left="0"
        w="full"
        h="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={100}
      >
        <Text fontSize="lg" fontFamily="mono">
          Asset not found: {assetId || "none"}
        </Text>
      </Box>
    );
  }

  if (!objectUrl) return null;

  return (
    <Box position="absolute" top="0" left="0" w="full" h="full" zIndex={100}>
      <img
        src={objectUrl}
        alt={`asset ${assetId}`}
        onError={() => setHasError(true)}
        style={{ width: "100%", height: "100%", objectFit: fit }}
      />
    </Box>
  );
}
