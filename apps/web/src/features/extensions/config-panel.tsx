import { Button, EmptyState, HStack, Stack, Text } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { useForm, useSelector } from "@tanstack/react-form";
import { getDefaultValues, type RuntimeFormDefinition, toValibotSchema } from "@tgb-form/core";
import { TgbForm } from "@tgb-form/react";
import { type TimelineEvent, TimelineEventType } from "@tgb-resolver/realtime";
import { useEffect, useMemo } from "react";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-model";
import { showModel } from "@/features/shared/show-model";

import { extensionRegistry } from "./base/registry";
import { MediaExtension, type MediaExtensionPayload } from "./media";
import { computeMediaExtensionDuration } from "./media/duration";
import { usePatchExtensionPayload } from "./patch";
import { sharedRendererRegistry } from "./renderers";
import { toTgbFormInstance } from "./tgb-form-instance";

type CustomTimelineEvent = Extract<TimelineEvent, { type: TimelineEventType.CUS }>;

function unwrapRestoredValue(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (!isRecord(value)) return value;
  const record = value;
  if (Object.keys(record).length === 1 && "value" in record)
    return unwrapRestoredValue(record.value);
  return value;
}

function isRecord(value: object): value is Record<string, unknown> {
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function restoredPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload) return {};
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, unwrapRestoredValue(value)]),
  );
}

interface ExtensionConfigPanelProps {
  panel: FloatingPanelHandle;
  eventId: number;
}

export function ExtensionConfigPanel({ panel, eventId }: ExtensionConfigPanelProps) {
  const event = showModel.showEvents.value[eventId];

  if (!event || event.type !== TimelineEventType.CUS) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Title>No configuration available</EmptyState.Title>
          <EmptyState.Description>This event has no extension config.</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  const ext = extensionRegistry.extensionWithExtId(event.payload.extId);
  const configForm = ext?.configForm;

  if (!configForm) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Title>No configuration available</EmptyState.Title>
          <EmptyState.Description>
            Extension "{event.payload.extId}" has no config form.
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return (
    <ExtensionConfigForm panel={panel} event={event} eventId={eventId} configForm={configForm} />
  );
}

function ExtensionConfigForm({
  panel,
  event,
  eventId,
  configForm,
}: {
  panel: FloatingPanelHandle;
  event: CustomTimelineEvent;
  eventId: number;
  configForm: RuntimeFormDefinition;
}) {
  const patchPayload = usePatchExtensionPayload();
  const error = useSignal<string | null>(null);

  const baseline = useMemo(
    () =>
      ({ ...getDefaultValues(configForm), ...restoredPayload(event.payload.extPayload) }) as Record<
        string,
        unknown
      >,
    [configForm, event],
  );

  const form = useForm({
    defaultValues: baseline,
    validators: {
      onSubmit: toValibotSchema(configForm) as never,
    },
    onSubmit: async ({ value }) => {
      error.value = null;
      panel.setSaving(true);
      try {
        let durationSeconds: number | undefined;
        if (event.payload.extId === MediaExtension.extId) {
          durationSeconds =
            (await computeMediaExtensionDuration(value as MediaExtensionPayload)) ?? undefined;
        }
        if (durationSeconds !== undefined) {
          await patchPayload(eventId, event.payload.extId, value, durationSeconds);
        } else {
          await patchPayload(eventId, event.payload.extId, value);
        }
        panel.close(true);
      } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
      } finally {
        panel.setSaving(false);
      }
    },
  });

  const isDirty = useSelector(
    form.store,
    (state) => JSON.stringify(state.values) !== JSON.stringify(baseline),
  );
  const canSubmit = useSelector(form.store, (state) => state.canSubmit);

  useEffect(() => {
    panel.setDirty(isDirty);
  }, [isDirty, panel]);

  return (
    <Stack gap={4} h="full">
      <TgbForm
        definition={configForm}
        instance={toTgbFormInstance(form)}
        renderers={sharedRendererRegistry}
        style={{ gap: "1rem", display: "flex", flexDirection: "column" }}
      />
      <HStack justify="end">
        <Button variant="outline" onClick={() => void panel.requestClose()}>
          Cancel
        </Button>
        <Button
          disabled={!canSubmit || !isDirty || panel.isSaving.value}
          onClick={() => void form.handleSubmit()}
        >
          Save
        </Button>
      </HStack>
      {error.value && (
        <Text color="fg.error" fontSize="sm">
          {error.value}
        </Text>
      )}
    </Stack>
  );
}
