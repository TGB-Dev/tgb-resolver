import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearShow,
  createTimelineEvent,
  deleteTimelineEvent,
  disableLiveMode,
  enableLiveMode,
  exportShowBundle,
  generatedClient,
  importShowBundle,
  importShowXml,
  moveTimelineEvent,
  optimizeShow,
  patchNonResolveEvent,
  patchTimelineEvent,
  renameResolveEvent,
  resetPlayback,
  type SetAutomationRequest,
  ShowMode,
  type ShowStateSnapshot,
  seekPlayback,
  setAutomation,
  setSettings,
  startPlayback,
  TimelineEventType,
  tgbResolverServerFeaturesShowGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import { FILE_EXTENSION, type TimelineTableItem } from "@tgb-resolver/realtime";
import { Effect, Schedule } from "effect";

import { playbackModel } from "@/features/control/playback-model";
import { realtimeModel } from "@/features/shared/realtime-model";
import { showModel } from "@/features/shared/show-model";

import { controlShowQueryKey } from "./realtime-handler";
import { mapShowStateSnapshotToShowFile } from "./show-mapper";

function setShowInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ShowStateSnapshot,
) {
  queryClient.setQueryData(controlShowQueryKey(), snapshot);
  playbackModel.syncVersion(snapshot.showVersion ?? 0);
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

export function useControlShowRows(): TimelineTableItem[] {
  return showModel.rows.value;
}

export function useControlIsLive() {
  return useControlShowQuery().data?.mode === ShowMode.LIVE;
}

export function useControlCanMutate() {
  const showQuery = useControlShowQuery();

  return realtimeModel.connectionStatus.value === "connected" && !!showQuery.data;
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
          body: { showVersion: playbackModel.state.value.showVersion },
        });

        return data as ShowStateSnapshot;
      });
    },
    // Playback-only response: do NOT setQueryData. The response carries the
    // whole show, so writing it re-runs the query select (full show mapping)
    // and re-emits to every consumer, re-rendering the entire timeline on a
    // play/pause. Playback state is delivered by the SignalR
    // PlaybackStateChanged broadcast (the authoritative path); a version bump
    // cannot happen here (playback mutations don't advance the show version).
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
          body: { showVersion: playbackModel.state.value.showVersion },
        });

        return data as ShowStateSnapshot;
      });
    },
    // Playback-only response - do NOT setQueryData (see useStartPlaybackMutation).
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
          body: { showVersion: playbackModel.state.value.showVersion, eventId },
        });

        return data as ShowStateSnapshot;
      });
    },
    // Playback-only response — do NOT setQueryData. Writing the response here
    // re-runs the query select (mapShowStateSnapshotToShowFile maps the whole
    // timeline) and re-emits to every consumer, re-rendering ~111 timeline
    // rows + the cue tab on every seek. Playback state arrives via the SignalR
    // PlaybackStateChanged broadcast; a seek cannot bump the show version.
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
          body: { showVersion: playbackModel.state.value.showVersion },
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
          body: { showVersion: playbackModel.state.value.showVersion },
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
              showVersion: playbackModel.state.value.showVersion,
              customName: payload.customName.trim(),
            },
          });
          return data as ShowStateSnapshot;
        }

        const { data } = await patchNonResolveEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: {
            showVersion: playbackModel.state.value.showVersion,
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

export function usePatchTimelineEventMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (payload: {
      eventId: number;
      durationSeconds?: number;
      useDefaultDuration?: boolean;
      triggerOffsetSeconds?: number;
      clearTriggerOffset?: boolean;
      requireManualInteraction?: boolean;
    }) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await patchTimelineEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: { showVersion: playbackModel.state.value.showVersion, ...payload },
        });
        return data as ShowStateSnapshot;
      });
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useMoveTimelineEventMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (payload: {
      eventId: number;
      relativeToEventId: number;
      before: boolean;
    }) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await moveTimelineEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: {
            showVersion: playbackModel.state.value.showVersion,
            relativeToEventId: payload.relativeToEventId,
            before: payload.before,
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

export function useCreateTimelineEventMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (payload: {
      relativeToEventId: number;
      before: boolean;
      customName?: string;
      durationSeconds?: number | null;
      custom: { extId: string; extPayload: Record<string, unknown> };
    }) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await createTimelineEvent({
          client: generatedClient,
          body: { showVersion: playbackModel.state.value.showVersion, ...payload },
        });
        return data as ShowStateSnapshot;
      });
    },
    onSuccess: (data) => {
      setShowInCache(queryClient, data);
    },
  });
}

export function useDeleteTimelineEventMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (eventId: number) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await deleteTimelineEvent({
          client: generatedClient,
          path: { id: eventId },
          body: { showVersion: playbackModel.state.value.showVersion },
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
          throwOnError: true,
        });
        return data as ShowStateSnapshot;
      }

      if (fileName.endsWith(FILE_EXTENSION)) {
        const { data } = await importShowBundle({
          client: generatedClient,
          body: {
            bytes: arrayBufferToBase64(await file.arrayBuffer()),
          },
          throwOnError: true,
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

export function useControlFullAutoEnabled() {
  return useControlShowQuery().data?.automation?.fullAutoEnabled ?? false;
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
            showVersion: playbackModel.state.value.showVersion,
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

export function useControlTickRate() {
  return useControlShowQuery().data?.tickRate ?? undefined;
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (tickRate: number | null) => {
      requireShow(showQuery.data);
      return await withRetry(queryClient, async () => {
        const { data } = await setSettings({
          client: generatedClient,
          body: {
            showVersion: playbackModel.state.value.showVersion,
            tickRate,
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
