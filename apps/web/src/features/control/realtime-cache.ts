import type { QueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointQueryKey,
} from "@tgb-resolver/contracts";
import type { ShowWebSocketMessage } from "@tgb-resolver/realtime";
import { startTransition } from "react";

import { syncPlaybackFromSnapshot } from "@/models/playback-state";

export function controlShowQueryKey() {
  return tgbResolverServerFeaturesShowGetShowEndpointQueryKey({ client: generatedClient });
}

export async function applyControlRealtimeMessage(
  queryClient: QueryClient,
  message: ShowWebSocketMessage,
) {
  if (message.type === "playback-state-changed") {
    syncPlaybackFromSnapshot(message.showVersion, message.playback);
    return;
  }

  if (message.type === "live-mode-changed") {
    startTransition(() => {
      void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
    });
    return;
  }

  if (message.type === "show-refetch-required") {
    // Keep current playback signal until REST refetch reconciles it.
    startTransition(() => {
      void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
    });
    return;
  }

  startTransition(() => {
    void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
  });
}
