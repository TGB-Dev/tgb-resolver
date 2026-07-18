import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  type SetAutomationRequest,
  ShowMode,
  type ShowStateSnapshot,
  seekPlayback,
  setAutomation,
  startPlayback,
  TimelineEventType,
  tgbResolverServerFeaturesShowGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import {
  FILE_EXTENSION,
  type TimelineTableItem,
  toTimelineTableItems,
} from "@tgb-resolver/realtime";
import { Effect, Schedule } from "effect";
import { useMemo, useRef } from "react";

import { playbackSignal } from "@/models/playback-state";

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

function is409Error(error: unknown): boolean {
  return (
    (error as { status?: number })?.status === 409 ||
    (error as { response?: { status?: number } })?.response?.status === 409
  );
}

export function withRetry<T>(queryClient: QueryClient, fn: () => Promise<T>): Promise<T> {
  const runMutation = Effect.tryPromise({
    try: fn,
    catch: (error) => error,
  }).pipe(
    Effect.tapError((error) =>
      is409Error(error)
        ? Effect.tryPromise({
            try: async () => {
              await queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
              await queryClient.refetchQueries({ queryKey: controlShowQueryKey() });
            },
            catch: (refetchError) => refetchError,
          })
        : Effect.succeed(undefined),
    ),
  );

  return Effect.runPromise(
    Effect.retry(
      runMutation,
      Schedule.recurWhile((error: unknown) => is409Error(error)).pipe(
        Schedule.intersect(Schedule.once),
      ),
    ),
  );
}

export function useControlShowQuery() {
  return useQuery({
    ...tgbResolverServerFeaturesShowGetShowEndpointOptions({ client: generatedClient }),
    queryKey: controlShowQueryKey(),
    select: mapShowStateSnapshotToShowFile,
  });
}

export function useControlShowRows() {
  const showQuery = useControlShowQuery();
  const nextRows = useMemo(
    () => (showQuery.data ? toTimelineTableItems(showQuery.data) : []),
    [showQuery.data],
  );

  return useStableRowIdentity(nextRows);
}

function hashTimelineRow(row: TimelineTableItem): number {
  let h = 0x811c9dc5;
  for (const value of Object.values(row)) {
    if (typeof value === "string") {
      for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
    } else if (typeof value === "number") {
      h = Math.imul(h ^ (value & 0xffff), 0x01000193);
      h = Math.imul(h ^ (value >>> 16), 0x01000193);
    } else if (value != null) {
      h = Math.imul(h ^ 1, 0x01000193);
    }
  }
  return h >>> 0;
}

function useStableRowIdentity(nextRows: TimelineTableItem[]): TimelineTableItem[] {
  const prevRef = useRef<Map<number, { hash: number; row: TimelineTableItem }>>(new Map());

  return useMemo(() => {
    if (prevRef.current.size === 0) {
      const cache = new Map<number, { hash: number; row: TimelineTableItem }>();
      const rows = nextRows.map((row) => {
        const hash = hashTimelineRow(row);
        cache.set(row.id, { hash, row });
        return row;
      });
      prevRef.current = cache;
      return rows;
    }

    const merged = nextRows.map((row) => {
      const hash = hashTimelineRow(row);
      const prev = prevRef.current.get(row.id);
      if (prev && prev.hash === hash) return prev.row;
      prevRef.current.set(row.id, { hash, row });
      return row;
    });

    return merged;
  }, [nextRows]);
}

export function useControlIsLive() {
  return useControlShowQuery().data?.mode === ShowMode.LIVE;
}

export function useControlCanMutate() {
  const { connectionStatus } = useControlRealtime();
  const showQuery = useControlShowQuery();

  return connectionStatus.value === "connected" && !!showQuery.data;
}

export function useStartPlaybackMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await startPlayback({
          client: generatedClient,
          body: { showVersion: playbackSignal.value.showVersion },
        });

        return data as ShowStateSnapshot;
      });
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
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await resetPlayback({
          client: generatedClient,
          body: { showVersion: playbackSignal.value.showVersion },
        });

        return data as ShowStateSnapshot;
      });
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useSeekPlaybackMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (eventId: number) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await seekPlayback({
          client: generatedClient,
          body: { showVersion: playbackSignal.value.showVersion, eventId },
        });

        return data as ShowStateSnapshot;
      });
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
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await optimizeShow({
          client: generatedClient,
          body: { showVersion: playbackSignal.value.showVersion },
        });

        return data as ShowStateSnapshot;
      });
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
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await clearShow({
          client: generatedClient,
          body: { showVersion: playbackSignal.value.showVersion },
        });

        return data as ShowStateSnapshot;
      });
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

      if (show.mode === ShowMode.LIVE) {
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
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        if (payload.type === TimelineEventType.RES) {
          const { data } = await renameResolveEvent({
            client: generatedClient,
            path: { id: payload.eventId },
            body: {
              showVersion: playbackSignal.value.showVersion,
              customName: payload.customName.trim(),
            },
          });
          return data as ShowStateSnapshot;
        }

        const eventType =
          payload.type === TimelineEventType.IMG ? TimelineEventType.IMG : TimelineEventType.SFX;
        const { data } = await patchNonResolveEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: {
            showVersion: playbackSignal.value.showVersion,
            type: eventType,
            customName: payload.customName.trim(),
          },
        });
        return data as ShowStateSnapshot;
      });
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useImportShowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      excludedUsernames = [],
    }: {
      file: File;
      excludedUsernames?: string[];
    }) => {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".xml")) {
        const { data } = await importShowXml({
          client: generatedClient,
          body: { xml: await file.text(), excludedUsernames },
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

export function useControlAutoResolveEnabled() {
  return useControlShowQuery().data?.automation?.autoResolveEnabled ?? false;
}

export function useControlAutoResolveSpeedMs() {
  return useControlShowQuery().data?.automation?.autoResolveSpeedMs ?? 3000;
}

export function useUpdateAutomationMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (
      patch: Partial<
        Pick<SetAutomationRequest, "autoResolveEnabled" | "autoResolveSpeedMs" | "fullAutoEnabled">
      >,
    ) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await setAutomation({
          client: generatedClient,
          body: {
            showVersion: playbackSignal.value.showVersion,
            ...patch,
          },
        });
        return data as ShowStateSnapshot;
      });
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
