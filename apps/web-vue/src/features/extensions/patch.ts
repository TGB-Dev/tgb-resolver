import { getDefaultValues, toValibotSchema } from "@tgb-form/core";
import { generatedClient, patchTimelineEvent } from "@tgb-resolver/contracts";
import { TimelineEventType } from "@tgb-resolver/realtime";
import { safeParse } from "valibot";

import { usePlaybackStore } from "@/features/control/playback-store";
import { useShowStore } from "@/stores/show-store";

import { extensionRegistry } from "./registry";

function patchExtensionPayload(payload: Record<string, unknown>, patch: Record<string, unknown>) {
  return { ...payload, ...patch };
}

class ExtensionPayloadValidationError extends Error {
  constructor(readonly issues: readonly unknown[]) {
    super("Extension payload validation failed");
    this.name = "ExtensionPayloadValidationError";
  }
}

export async function patchExtensionEvent(
  eventId: number,
  extId: string,
  patch: Record<string, unknown>,
  durationSeconds?: number,
) {
  const extension = extensionRegistry.extensionWithExtId(extId);
  const event = useShowStore().showEvents[eventId];
  if (!extension) throw new Error(`Unknown extension: ${extId}`);
  if (!event || event.type !== TimelineEventType.CUS || event.payload.extId !== extId)
    throw new Error(`Event ${eventId} is not a ${extId} custom event`);
  const defaults = extension.configForm ? getDefaultValues(extension.configForm) : {};
  const merged = patchExtensionPayload(
    defaults,
    patchExtensionPayload(event.payload.extPayload ?? {}, patch),
  );
  const schema = extension.configForm ? toValibotSchema(extension.configForm) : undefined;
  const result = schema ? safeParse(schema, merged) : { success: true as const, output: merged };
  if (!result.success) throw new ExtensionPayloadValidationError(result.issues);
  await patchTimelineEvent({
    client: generatedClient,
    path: { id: eventId },
    body: {
      showVersion: usePlaybackStore().state.showVersion,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
      custom: { extId, extPayload: result.output as Record<string, unknown> },
    },
    throwOnError: true,
  });
}
