import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearShow,
  disableLiveMode,
  enableLiveMode,
  exportShowBundle,
  generatedClient,
  importShowBundle,
  importShowXml,
  optimizeShow,
  patchNonResolveEvent,
  renameResolveEvent,
  resetPlayback,
  type ShowStateSnapshot,
  startPlayback,
  tgbResolverServerEndpointsGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import { FILE_EXTENSION, toTimelineTableItems } from "@tgb-resolver/realtime";
import { useMemo } from "react";

import { controlShowQueryKey } from "./realtime-cache";
import { useControlRealtime } from "./realtime-provider";
import { mapShowStateSnapshotToShowFile } from "./show-mapper";

function setShowInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ShowStateSnapshot,
) {
  queryClient.setQueryData(controlShowQueryKey(), snapshot);
}

function requireShow(show: ReturnType<typeof useControlShowQuery>["data"]) {
  if (!show) {
    throw new Error("No show loaded");
  }

  return show;
}

export function useControlShowQuery() {
  return useQuery({
    ...tgbResolverServerEndpointsGetShowEndpointOptions({ client: generatedClient }),
    queryKey: controlShowQueryKey(),
    select: mapShowStateSnapshotToShowFile,
  });
}

export function useControlShowRows() {
  const showQuery = useControlShowQuery();

  return useMemo(
    () => (showQuery.data ? toTimelineTableItems(showQuery.data) : []),
    [showQuery.data],
  );
}

export function useControlIsLive() {
  return useControlShowQuery().data?.mode === "live";
}

export function useControlCanMutate() {
  const { connectionStatus } = useControlRealtime();
  const showQuery = useControlShowQuery();

  return connectionStatus === "connected" && !!showQuery.data;
}

export function useStartPlaybackMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      const show = requireShow(showQuery.data);
      const { data } = await startPlayback({
        client: generatedClient,
        body: { showVersion: show.showVersion },
      });

      return data as ShowStateSnapshot;
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useResetPlaybackMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      const show = requireShow(showQuery.data);
      const { data } = await resetPlayback({
        client: generatedClient,
        body: { showVersion: show.showVersion },
      });

      return data as ShowStateSnapshot;
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useOptimizeShowMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      const show = requireShow(showQuery.data);
      const { data } = await optimizeShow({
        client: generatedClient,
        body: { showVersion: show.showVersion },
      });

      return data as ShowStateSnapshot;
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useClearShowMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      const show = requireShow(showQuery.data);
      const { data } = await clearShow({
        client: generatedClient,
        body: { showVersion: show.showVersion },
      });

      return data as ShowStateSnapshot;
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useToggleLiveModeMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      const show = requireShow(showQuery.data);

      if (show.mode === "live") {
        const { data } = await disableLiveMode({
          client: generatedClient,
        });
        return data as ShowStateSnapshot;
      }

      const { data } = await enableLiveMode({
        client: generatedClient,
      });
      return data as ShowStateSnapshot;
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useRenameControlEventMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (payload: { eventId: number; type: string; customName: string }) => {
      const show = requireShow(showQuery.data);

      if (payload.type === "RES") {
        const { data } = await renameResolveEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: {
            showVersion: show.showVersion,
            customName: payload.customName.trim(),
          },
        });
        return data as ShowStateSnapshot;
      }

      const eventType = payload.type === "IMG" ? "Img" : "Sfx";
      const { data } = await patchNonResolveEvent({
        client: generatedClient,
        path: { id: payload.eventId },
        body: {
          showVersion: show.showVersion,
          type: eventType,
          customName: payload.customName.trim(),
        },
      });
      return data as ShowStateSnapshot;
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useImportShowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".xml")) {
        const { data } = await importShowXml({
          client: generatedClient,
          body: { xml: await file.text() },
        });
        return data as ShowStateSnapshot;
      }

      if (fileName.endsWith(FILE_EXTENSION)) {
        const { data } = await importShowBundle({
          client: generatedClient,
          body: {
            bytes: arrayBufferToBase64(await file.arrayBuffer()),
          },
        });
        return data as ShowStateSnapshot;
      }

      throw new Error(`Unsupported file format: ${file.name}`);
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useExportShowAction() {
  return async () => {
    const response = await exportShowBundle({
      client: generatedClient,
    });

    const blob = new Blob([(response.data ?? "") as unknown as BlobPart], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `show${FILE_EXTENSION}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
