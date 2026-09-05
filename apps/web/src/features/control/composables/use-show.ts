import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  clearShow,
  createTimelineEvent,
  deleteTimelineEvent,
  disableLiveMode,
  enableLiveMode,
  exportShowBundle,
  generatedClient,
  getShow,
  type ImportXmlUser,
  importShowBundle,
  importShowXml,
  importShowXmlUsers,
  moveTimelineEvent,
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
} from "@tgb-resolver/contracts";
import { FILE_EXTENSION, type ShowFile, type TimelineTableItem } from "@tgb-resolver/realtime";
import { Effect, Schedule } from "effect";
import { type ComputedRef, computed } from "vue";

import { usePlaybackStore } from "@/features/control/playback-store";
import { mapShowStateSnapshotToShowFile } from "@/features/control/show-mapper";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useShowStore } from "@/stores/show-store";

import { controlShowQueryKey } from "../realtime-handler";

function setShowInCache(queryClient: QueryClient, snapshot: ShowStateSnapshot) {
  queryClient.setQueryData(controlShowQueryKey(), snapshot);
  usePlaybackStore().syncVersion(snapshot.showVersion ?? 0);
}

function requireShow(show: ShowFile | undefined) {
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
    queryKey: controlShowQueryKey(),
    queryFn: async ({ queryKey, signal }) => {
      const { data } = await getShow({
        client: generatedClient,
        ...queryKey[0],
        signal,
        throwOnError: true,
      });

      return data;
    },
    select: mapShowStateSnapshotToShowFile,
  });
}

export function useControlShowRows(): ComputedRef<TimelineTableItem[]> {
  return computed(() => useShowStore().rows);
}

export function useControlIsLive(): ComputedRef<boolean> {
  const showQuery = useControlShowQuery();

  return computed(() => showQuery.data.value?.mode === ShowMode.LIVE);
}

export function useControlCanMutate(): ComputedRef<boolean> {
  const showQuery = useControlShowQuery();

  return computed(
    () => useRealtimeStore().connectionStatus === "connected" && !!showQuery.data.value,
  );
}

export function useStartPlaybackMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await startPlayback({
          client: generatedClient,
          body: { showVersion: usePlaybackStore().state.showVersion },
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
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await resetPlayback({
          client: generatedClient,
          body: { showVersion: usePlaybackStore().state.showVersion },
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
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await seekPlayback({
          client: generatedClient,
          body: { showVersion: usePlaybackStore().state.showVersion, eventId },
        });

        return data as ShowStateSnapshot;
      });
    },
    // Playback-only response - do NOT setQueryData. Writing the response here
    // re-runs the query select (mapShowStateSnapshotToShowFile maps the whole
    // timeline) and re-emits to every consumer, re-rendering ~111 timeline
    // rows + the cue tab on every seek. Playback state arrives via the SignalR
    // PlaybackStateChanged broadcast; a seek cannot bump the show version.
  });
}

export function useClearShowMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async () => {
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await clearShow({
          client: generatedClient,
          body: { showVersion: usePlaybackStore().state.showVersion },
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
      const show = requireShow(showQuery.data.value);

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
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        if (payload.type === TimelineEventType.RES) {
          const { data } = await renameResolveEvent({
            client: generatedClient,
            path: { id: payload.eventId },
            body: {
              showVersion: usePlaybackStore().state.showVersion,
              customName: payload.customName.trim(),
            },
          });
          return data as ShowStateSnapshot;
        }

        const { data } = await patchNonResolveEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: {
            showVersion: usePlaybackStore().state.showVersion,
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
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await patchTimelineEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: { showVersion: usePlaybackStore().state.showVersion, ...payload },
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
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await moveTimelineEvent({
          client: generatedClient,
          path: { id: payload.eventId },
          body: {
            showVersion: usePlaybackStore().state.showVersion,
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
      durationSeconds?: number | null | undefined;
      custom: { extId: string; extPayload: Record<string, unknown> };
    }) => {
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await createTimelineEvent({
          client: generatedClient,
          body: {
            showVersion: usePlaybackStore().state.showVersion,
            ...payload,
            durationSeconds: payload.durationSeconds ?? undefined,
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

export function useDeleteTimelineEventMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (eventId: number) => {
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await deleteTimelineEvent({
          client: generatedClient,
          path: { id: eventId },
          body: { showVersion: usePlaybackStore().state.showVersion },
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

/**
 * Fetches the list of users/teams contained in an ICPC XML file so the import
 * panel can present them as a multi-select of exclusions. Only meaningful for
 * `.xml` imports; bundle (`.tgbresolver`) imports have no user list.
 */
export function useImportXmlUsers(xml: () => string | null) {
  return useQuery({
    queryKey: computed(() => ["import-xml-users", xml()]),
    queryFn: async ({ signal }) => {
      const text = xml();
      if (!text) return [];
      const { data } = await importShowXmlUsers({
        client: generatedClient,
        body: { xml: text },
        signal,
        throwOnError: true,
      });
      return (data as ImportXmlUser[]) ?? [];
    },
    enabled: computed(() => xml() != null),
  });
}

export function useControlAutoResolveEnabled(): ComputedRef<boolean> {
  const showQuery = useControlShowQuery();

  return computed(() => showQuery.data.value?.automation?.autoResolveEnabled ?? false);
}

export function useControlAutoResolveSpeedMs(): ComputedRef<number> {
  const showQuery = useControlShowQuery();

  return computed(() => showQuery.data.value?.automation?.autoResolveSpeedMs ?? 3000);
}

export function useControlFullAutoEnabled(): ComputedRef<boolean> {
  const showQuery = useControlShowQuery();

  return computed(() => showQuery.data.value?.automation?.fullAutoEnabled ?? false);
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
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await setAutomation({
          client: generatedClient,
          body: {
            showVersion: usePlaybackStore().state.showVersion,
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

export function useControlTickRate(): ComputedRef<number | undefined> {
  const showQuery = useControlShowQuery();

  return computed(() => showQuery.data.value?.tickRate ?? undefined);
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  const showQuery = useControlShowQuery();

  return useMutation({
    mutationFn: async (tickRate: number | null | undefined) => {
      requireShow(showQuery.data.value);
      return await withRetry(queryClient, async () => {
        const { data } = await setSettings({
          client: generatedClient,
          body: {
            showVersion: usePlaybackStore().state.showVersion,
            tickRate: tickRate ?? undefined,
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
