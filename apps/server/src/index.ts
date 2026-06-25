import { cors } from "@elysia/cors";
import { node } from "@elysia/node";
import {
  type AssetUploadRequest,
  FILE_EXTENSION,
  type ImportBundleRequest,
  type ImportXmlRequest,
  type NonResolveEventPatchRequest,
  type NonResolveInsertRequest,
  type PlaybackAutomationPatchRequest,
  type PlaySfxEvent,
  type ResolveEventPatchRequest,
  type ShowImageEvent,
  type ShowVersionedRequest,
} from "@tgb-resolver/contracts";
import { Elysia, status } from "elysia";
import { mapShowServiceError } from "./route-errors";
import {
  assetUploadRequestSchema,
  importBundleRequestSchema,
  importXmlRequestSchema,
  nonResolveEventPatchRequestSchema,
  nonResolveInsertRequestSchema,
  playbackAutomationPatchRequestSchema,
  resolveEventPatchRequestSchema,
  serviceErrorResponseSchema,
  showVersionedRequestSchema,
} from "./route-schemas";
import { ShowService } from "./show-service";

const mutationErrorResponses = {
  400: serviceErrorResponseSchema,
  404: serviceErrorResponseSchema,
  409: serviceErrorResponseSchema,
} as const;

async function runShowMutation<T>(action: () => T | Promise<T>) {
  try {
    return await action();
  } catch (error) {
    return mapShowServiceError(error);
  }
}

function findShowEventOrNotFound(service: ShowService, id: number) {
  const event = service.getShow().timeline.find((candidate) => candidate.id === id);

  return event ?? status(404, { message: "Event not found" });
}

export function createApp(service = new ShowService()) {
  const app = new Elysia({ adapter: node(), normalize: false })
    .use(
      cors({
        origin: true,
      }),
    )
    .get("/", () => "tgb-resolver")
    .get("/show", () => service.getShow())
    .get("/show/events", () => service.getShow().timeline)
    .get("/show/timeline", () => service.getShow().timeline)
    .get("/show/assets", () => service.getShow().assets)
    .post(
      "/show/import/xml",
      ({ body }) => runShowMutation(() => service.importXml((body as ImportXmlRequest).xml)),
      {
        body: importXmlRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/show/import/bundle",
      ({ body }) =>
        runShowMutation(() =>
          service.importBundle(Buffer.from((body as ImportBundleRequest).bytes, "base64")),
        ),
      {
        body: importBundleRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .get("/show/export/bundle", async ({ set }) => {
      set.headers["content-type"] = "application/octet-stream";
      set.headers["content-disposition"] = `attachment; filename="show${FILE_EXTENSION}"`;
      return service.exportBundle();
    })
    .get("/show/export.tgbresolver", async ({ set }) => {
      set.headers["content-type"] = "application/octet-stream";
      set.headers["content-disposition"] = `attachment; filename="show${FILE_EXTENSION}"`;
      return service.exportBundle();
    })
    .post(
      "/show/optimize",
      ({ body }) =>
        runShowMutation(() => service.optimize((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/show/clear",
      ({ body }) =>
        runShowMutation(() => service.clearShow((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post("/show/live", () => service.setLiveMode("live"))
    .delete("/show/live", () => service.setLiveMode("editing"))
    .get("/show/events/:id", ({ params }) => findShowEventOrNotFound(service, Number(params.id)))
    .patch(
      "/show/events/resolve/:id",
      ({ params, body }) =>
        runShowMutation(() =>
          service.patchResolveEvent(
            Number(params.id),
            (body as ResolveEventPatchRequest).showVersion,
            body as ResolveEventPatchRequest,
          ),
        ),
      {
        body: resolveEventPatchRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .patch(
      "/show/events/non-resolve/:id",
      ({ params, body }) =>
        runShowMutation(() => {
          const { showVersion, ...patch } = body as NonResolveEventPatchRequest;
          return service.patchNonResolveEvent(Number(params.id), showVersion, patch);
        }),
      {
        body: nonResolveEventPatchRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/show/events/non-resolve",
      ({ body }) =>
        runShowMutation(() => {
          const request = body as NonResolveInsertRequest;
          return service.insertNonResolveEvent(
            request.showVersion,
            request.event as ShowImageEvent | PlaySfxEvent,
          );
        }),
      {
        body: nonResolveInsertRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .delete(
      "/show/events/non-resolve/:id",
      ({ params, body }) =>
        runShowMutation(() =>
          service.deleteNonResolveEvent(
            Number(params.id),
            (body as ShowVersionedRequest).showVersion,
          ),
        ),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/assets/:kind",
      ({ params, body }) =>
        runShowMutation(() => {
          const request = body as AssetUploadRequest;
          const asset = service.uploadAsset({
            kind: params.kind as "image" | "sfx",
            id: request.id,
            originalName: request.originalName,
            contentType: request.contentType,
            bytes: Buffer.from(request.bytes, "base64"),
          });

          return service.addAssetToShow(request.showVersion, asset);
        }),
      {
        body: assetUploadRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .get("/assets/:kind/:fileName", ({ params, set }) => {
      const show = service.getShow();
      const asset = [...show.assets.images, ...show.assets.sfx].find(
        (entry) => entry.fileName === params.fileName && entry.kind === params.kind,
      );

      if (!asset) {
        return status(404, "Not found");
      }

      set.headers["content-type"] = asset.contentType;
      return service.readAssetFile(asset.fileName);
    })
    .post(
      "/playback/start",
      ({ body }) =>
        runShowMutation(() => service.startPlayback((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/pause",
      ({ body }) =>
        runShowMutation(() => service.pausePlayback((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/reset",
      ({ body }) =>
        runShowMutation(() => service.resetPlayback((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/next-resolve",
      ({ body }) =>
        runShowMutation(() => service.nextResolve((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/continue-segment",
      ({ body }) =>
        runShowMutation(() => service.continueSegment((body as ShowVersionedRequest).showVersion)),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/jump/:eventId",
      ({ params, body }) =>
        runShowMutation(() =>
          service.jumpToEvent(Number(params.eventId), (body as ShowVersionedRequest).showVersion),
        ),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .patch(
      "/playback/automation",
      ({ body }) =>
        runShowMutation(() => {
          const { showVersion, ...patch } = body as PlaybackAutomationPatchRequest;
          return service.setAutomation(showVersion, patch);
        }),
      {
        body: playbackAutomationPatchRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/auto-resolve/start",
      ({ body }) =>
        runShowMutation(() =>
          service.setAutomation((body as ShowVersionedRequest).showVersion, {
            autoResolveEnabled: true,
          }),
        ),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/auto-resolve/stop",
      ({ body }) =>
        runShowMutation(() =>
          service.setAutomation((body as ShowVersionedRequest).showVersion, {
            autoResolveEnabled: false,
          }),
        ),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/full-auto/start",
      ({ body }) =>
        runShowMutation(() =>
          service.setAutomation((body as ShowVersionedRequest).showVersion, {
            fullAutoEnabled: true,
          }),
        ),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .post(
      "/playback/full-auto/stop",
      ({ body }) =>
        runShowMutation(() =>
          service.setAutomation((body as ShowVersionedRequest).showVersion, {
            fullAutoEnabled: false,
          }),
        ),
      {
        body: showVersionedRequestSchema,
        response: {
          ...mutationErrorResponses,
        },
      },
    )
    .ws("/ws", {
      open(ws) {
        const unsubscribe = service.subscribe((message) => {
          ws.send(message);
        });

        // biome-ignore lint/suspicious/noExplicitAny: ws.data is typed loosely by Elysia
        (ws.data as any).unsubscribe = unsubscribe;
      },
      close(ws) {
        // biome-ignore lint/suspicious/noExplicitAny: ws.data is typed loosely by Elysia
        (ws.data as any).unsubscribe?.();
      },
      message() {
        return;
      },
    });

  return app;
}

const app = createApp().listen(5001, ({ hostname, port }) => {
  console.log(`Elysia is running at ${hostname}:${port}`);
});

export type App = typeof app;
