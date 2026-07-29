import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import { ShowConnectionStatus, type ShowWebSocketMessage } from "@tgb-resolver/realtime";
import { type ReactNode, useEffect, useRef } from "react";

import { BigRefetchOverlay } from "@/features/control/big-refetch-overlay";
import { playbackModel } from "@/features/control/playback-model";
import { realtimeModel } from "@/features/shared/realtime-model";
import { showModel } from "@/features/shared/show-model";
import { connectRealtime } from "@/lib/realtime-client";

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

  const syncPlaybackRef = useRef(false);

  useEffect(() => {
    if (!showQuery.data?.playback) {
      return;
    }

    showModel.hydrateFromSnapshot(showQuery.data);

    // Always sync the data version from REST; the version number is not
    // part of playback state and must track the current data version so
    // that subsequent mutations send the correct expectedShowVersion.
    // ShowReplaced (clear/import) never broadcasts PlaybackStateChanged,
    // so without this the version would go permanently stale.
    playbackModel.syncVersion(showQuery.data.showVersion ?? 0);

    // Seed playback state from REST on the very first data load only.
    // SignalR is the sole authoritative source for real-time playback
    // updates; subsequent REST refetches (reconnect, bigRefetch, stale)
    // carry stale state that would race past SignalR messages.
    if (!syncPlaybackRef.current) {
      syncPlaybackRef.current = true;
      playbackModel.syncFromSnapshot(showQuery.data.showVersion ?? 0, showQuery.data.playback);
    }

    realtimeModel.bigRefetching.value = false;
  }, [showQuery.data]);

  return (
    <>
      {children}
      <BigRefetchOverlay />
    </>
  );
}
