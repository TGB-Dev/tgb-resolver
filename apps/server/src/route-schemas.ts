import { t } from "elysia";

export const showVersionedRequestSchema = t.Object({
  showVersion: t.Number(),
});

export const importXmlRequestSchema = t.Object({
  xml: t.String(),
});

export const importBundleRequestSchema = t.Object({
  bytes: t.String(),
});

export const serviceErrorResponseSchema = t.Object({
  reason: t.Union([
    t.Literal("version_drift"),
    t.Literal("readonly"),
    t.Literal("invalid_state"),
    t.Literal("invalid_request"),
    t.Literal("not_found"),
  ]),
  showVersion: t.Number(),
  message: t.String(),
});

export const resolveEventPatchRequestSchema = t.Object({
  showVersion: t.Number(),
  customName: t.Optional(t.String()),
  triggerOffsetSeconds: t.Optional(t.Number()),
  requireManualInteraction: t.Optional(t.Boolean()),
});

export const nonResolveEventPayloadSchema = t.Object({
  imageId: t.Optional(t.String()),
  sfxId: t.Optional(t.String()),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
});

export const nonResolveEventPatchRequestSchema = t.Object({
  showVersion: t.Number(),
  type: t.Optional(t.Union([t.Literal("IMG"), t.Literal("SFX")])),
  triggerOffsetSeconds: t.Optional(t.Number()),
  requireManualInteraction: t.Optional(t.Boolean()),
  customName: t.Optional(t.String()),
  payload: t.Optional(nonResolveEventPayloadSchema),
});

export const nonResolveInsertRequestSchema = t.Object({
  showVersion: t.Number(),
  event: t.Object({
    id: t.Number(),
    type: t.Union([t.Literal("IMG"), t.Literal("SFX")]),
    triggerOffsetSeconds: t.Optional(t.Number()),
    requireManualInteraction: t.Optional(t.Boolean()),
    customName: t.Optional(t.String()),
    payload: nonResolveEventPayloadSchema,
  }),
});

export const assetUploadRequestSchema = t.Object({
  showVersion: t.Number(),
  id: t.String(),
  originalName: t.String(),
  contentType: t.String(),
  bytes: t.String(),
});

export const playbackAutomationPatchRequestSchema = t.Object({
  showVersion: t.Number(),
  autoResolveEnabled: t.Optional(t.Boolean()),
  autoResolveSpeedMs: t.Optional(t.Number()),
  fullAutoEnabled: t.Optional(t.Boolean()),
});
