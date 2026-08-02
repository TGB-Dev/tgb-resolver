import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { getDefaultValues, toValibotSchema } from "@tgb-form/core";
import { generatedClient, patchNonResolveEvent } from "@tgb-resolver/contracts";
import { TimelineEventType } from "@tgb-resolver/realtime";
import { safeParse } from "valibot";

import { withRetry } from "@/features/control/hooks";
import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";

import { extensionRegistry } from "./base/registry";

export class ExtensionPayloadValidationError extends Error {
  readonly issues: readonly unknown[];

  constructor(issues: readonly unknown[]) {
    super("Extension payload validation failed");
    this.name = "ExtensionPayloadValidationError";
    this.issues = issues;
  }
}

type AnySchema = ReturnType<typeof toValibotSchema>;

const schemaCache = new Map<string, AnySchema>();

function schemaFor(extId: string): AnySchema | undefined {
  const configForm = extensionRegistry.configFormFor(extId);
  if (!configForm) return undefined;

  let schema = schemaCache.get(extId);
  if (!schema) {
    schema = toValibotSchema(configForm);
    schemaCache.set(extId, schema);
  }
  return schema;
}

/**
 * Merges `patch` onto the current CustomEvent.extPayload for `extId` (seeded from the
 * extension's config-form defaults so partial patches stay valid on fresh events),
 * validates the full merged payload against the extension's config-form schema (throws
 * before any network call; unknown extPayload keys not declared in the config form are
 * dropped), then PATCHes the server through the existing 409-retry seam.
 */
export async function patchExtensionPayload(
  queryClient: QueryClient,
  eventId: number,
  extId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const ext = extensionRegistry.extensionWithExtId(extId);
  if (!ext) throw new Error(`Unknown extension: ${extId}`);

  const event = showModel.showEvents.value[eventId];
  if (!event || event.type !== TimelineEventType.CUS || event.payload.extId !== extId) {
    throw new Error(`Event ${eventId} is not a ${extId} custom event`);
  }

  const configForm = ext.configForm;
  const defaults = configForm ? getDefaultValues(configForm) : {};
  const merged = { ...defaults, ...event.payload.extPayload, ...patch };

  const schema = schemaFor(extId);
  let nextExtPayload: Record<string, unknown> = merged;
  if (schema) {
    const result = safeParse(schema, merged);
    if (!result.success) throw new ExtensionPayloadValidationError(result.issues);
    nextExtPayload = result.output as Record<string, unknown>;
  }

  await withRetry(queryClient, async () => {
    const { data } = await patchNonResolveEvent({
      client: generatedClient,
      path: { id: eventId },
      body: {
        showVersion: playbackModel.state.value.showVersion,
        custom: { extId, extPayload: nextExtPayload },
      },
    });
    return data;
  });
}

export function usePatchExtensionPayload() {
  const queryClient = useQueryClient();
  return (eventId: number, extId: string, patch: Record<string, unknown>) =>
    patchExtensionPayload(queryClient, eventId, extId, patch);
}
