import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import { ShowConnectionStatus, type ShowWebSocketMessage } from "@tgb-resolver/realtime";
import { type ReactNode, useEffect } from "react";

import { BigRefetchOverlay } from "@/components/control/big-refetch-overlay";
import { connectRealtime } from "@/lib/realtime-client";
import { playbackModel, realtimeModel, showModel } from "@/models";

import { applyControlRealtimeMessage, controlShowQueryKey } from "./realtime-handler";
import { mapShowStateSnapshotToShowFile } from "./show-mapper";

export function ControlRealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const showQuery = useQuery({
    ...tgbResolverServerFeaturesShowGetShowEndpointOptions({ client: generatedClient }),
    queryKey: controlShowQueryKey(),
    select: mapShowStateSnapshotToShowFile,
  });

  useEffect(() => {
    const disconnect = connectRealtime(
      (status) => {
        realtimeModel.connectionStatus.value = status;

        if (status === ShowConnectionStatus.Connected) {
          void queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
        }
      },
      (message: ShowWebSocketMessage) => {
        void applyControlRealtimeMessage(queryClient, message);
      },
    );
    return disconnect;
  }, [queryClient]);

  useEffect(() => {
    if (!showQuery.data?.playback) {
      return;
    }

    showModel.hydrateFromSnapshot(showQuery.data);
    playbackModel.syncFromSnapshot(showQuery.data.showVersion ?? 0, showQuery.data.playback);
    realtimeModel.bigRefetching.value = false;
  }, [showQuery.data]);

  return (
    <>
      {children}
      <BigRefetchOverlay />
    </>
  );
}
