import {
  Box,
  Button,
  Combobox,
  Field,
  HStack,
  Stack,
  Text,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { For } from "@preact/signals-react/utils";
import { useForm, useSelector } from "@tanstack/react-form";
import { getDefaultValues, type RuntimeFormDefinition, toValibotSchema } from "@tgb-form/core";
import { TgbForm } from "@tgb-form/react";
import { useEffect } from "react";

import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-model";
import { type Extension, extensionRegistry } from "@/features/extensions";
import { sharedRendererRegistry } from "@/features/extensions/renderers";
import { toTgbFormInstance } from "@/features/extensions/tgb-form-instance";

import { useCreateTimelineEventMutation } from "./hooks";

interface CreateEventPanelProps {
  panel: FloatingPanelHandle;
  relativeToEventId: number;
  before: boolean;
}

export function CreateEventPanel({ panel, relativeToEventId, before }: CreateEventPanelProps) {
  const selectedExtension = useSignal<Extension | null>(null);
  const extensions = extensionRegistry.extensionList.filter((extension) => extension.configForm);
  const { contains } = useFilter({ sensitivity: "base" });
  const { collection, filter } = useListCollection({
    initialItems: extensions,
    filter: contains,
    itemToString: (extension) => `${extension.shortName} - ${extension.description}`,
    itemToValue: (extension) => extension.extId,
  });

  return (
    <Stack gap={4} h="full">
      <Field.Root>
        <Combobox.Root
          openOnClick
          collection={collection}
          inputBehavior="autohighlight"
          onInputValueChange={({ inputValue }) => filter(inputValue)}
          onValueChange={({ items }) => {
            selectedExtension.value = items[0] ?? null;
          }}
        >
          <Combobox.Label>Extension</Combobox.Label>
          <Combobox.Control>
            <Combobox.Input placeholder="Choose an extension" />
            <Combobox.IndicatorGroup>
              <Combobox.Trigger />
            </Combobox.IndicatorGroup>
          </Combobox.Control>
          <Combobox.Positioner position="fixed">
            <Combobox.Content>
              <Combobox.Empty>No extensions found.</Combobox.Empty>
              <For each={collection.items}>
                {(extension) => (
                  <Combobox.Item key={extension.extId} item={extension}>
                    <Combobox.ItemText>
                      {extension.shortName} - {extension.description}
                    </Combobox.ItemText>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                )}
              </For>
            </Combobox.Content>
          </Combobox.Positioner>
        </Combobox.Root>
      </Field.Root>
      {selectedExtension.value?.configForm ? (
        <CreateEventForm
          key={selectedExtension.value.extId}
          panel={panel}
          relativeToEventId={relativeToEventId}
          before={before}
          extension={selectedExtension.value}
          configForm={selectedExtension.value.configForm}
        />
      ) : (
        <Box flex="1" />
      )}
    </Stack>
  );
}

function CreateEventForm({
  panel,
  relativeToEventId,
  before,
  extension,
  configForm,
}: {
  panel: FloatingPanelHandle;
  relativeToEventId: number;
  before: boolean;
  extension: Extension;
  configForm: RuntimeFormDefinition;
}) {
  const createTimelineEvent = useCreateTimelineEventMutation();
  const error = useSignal<string | null>(null);
  const defaultValues = getDefaultValues(configForm);
  const schema = toValibotSchema(configForm);
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema as never,
    },
    onSubmit: async ({ value }) => {
      error.value = null;
      panel.setSaving(true);
      try {
        await createTimelineEvent.mutateAsync({
          relativeToEventId,
          before,
          customName:
            (extension.extId === "img" || extension.extId === "media") &&
            typeof value.assetId === "string"
              ? assetsManagerModel.findEntryName(value.assetId)
              : undefined,
          custom: { extId: extension.extId, extPayload: { ...value } },
        });
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
    (state) => JSON.stringify(state.values) !== JSON.stringify(defaultValues),
  );

  useEffect(() => {
    panel.setDirty(isDirty);
  }, [isDirty, panel]);

  return (
    <>
      <TgbForm
        definition={configForm}
        instance={toTgbFormInstance(form)}
        renderers={sharedRendererRegistry}
        style={{ gap: "4px", display: "flex", flexDirection: "column" }}
      />
      <HStack justify="end">
        <Button variant="outline" onClick={() => void panel.requestClose()}>
          Cancel
        </Button>
        <Button disabled={panel.isSaving.value} onClick={() => void form.handleSubmit()}>
          Create
        </Button>
      </HStack>
      {error.value && (
        <Text color="fg.error" fontSize="sm">
          {error.value}
        </Text>
      )}
    </>
  );
}
